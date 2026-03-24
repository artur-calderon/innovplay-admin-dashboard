/**
 * Temas da sidebar (loja): modo claro e escuro.
 * Cada tema define variáveis CSS aplicadas na sidebar para fundo, ícones, texto e bordas.
 *
 * IMPORTANTE: O tema padrão do app (quando nenhum tema da loja está selecionado) é ROXO (#7B3FE4),
 * não azul. Isso vale para :root e .dark em index.css (primary, ring, sidebar-primary).
 */

export type SidebarThemeId = 'blue' | 'green' | 'violet' | 'amber' | 'rose' | 'dark' | 'cyan' | 'indigo' | 'emerald' | 'orange' | 'fuchsia' | 'teal' | null;

/** Chave localStorage para tema da sidebar de usuários que não são alunos */
export const NON_STUDENT_SIDEBAR_THEME_KEY = 'app_sidebar_theme_id';
/** Evento disparado quando o tema (não-aluno) é alterado nas configurações */
export const SIDEBAR_THEME_CHANGE_EVENT = 'app-sidebar-theme-change';

const VALID_THEME_IDS: SidebarThemeId[] = ['blue', 'green', 'violet', 'amber', 'rose', 'dark', 'cyan', 'indigo', 'emerald', 'orange', 'fuchsia', 'teal'];

export function getNonStudentSidebarThemeFromStorage(): SidebarThemeId {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(NON_STUDENT_SIDEBAR_THEME_KEY);
  if (!raw) return null;
  return VALID_THEME_IDS.includes(raw as SidebarThemeId) ? (raw as SidebarThemeId) : null;
}

export function setNonStudentSidebarThemeInStorage(themeId: SidebarThemeId): void {
  if (typeof window === 'undefined') return;
  if (themeId) localStorage.setItem(NON_STUDENT_SIDEBAR_THEME_KEY, themeId);
  else localStorage.removeItem(NON_STUDENT_SIDEBAR_THEME_KEY);
  window.dispatchEvent(new CustomEvent(SIDEBAR_THEME_CHANGE_EVENT));
}

export interface SidebarThemeVars {
  '--sidebar-bg': string;
  '--sidebar-border': string;
  '--sidebar-icon-bg': string;
  '--sidebar-icon-bg-hover': string;
  '--sidebar-icon-color': string;
  '--sidebar-icon-color-active': string;
  '--sidebar-text': string;
  '--sidebar-text-muted': string;
  '--sidebar-link-hover-bg': string;
  '--sidebar-link-active-bg': string;
  '--sidebar-link-active-text': string;
  '--sidebar-category-text': string;
  '--sidebar-user-card-bg': string;
  '--sidebar-user-card-border': string;
  '--sidebar-button-border': string;
  '--sidebar-button-hover-bg': string;
  '--sidebar-button-hover-text': string;
  '--sidebar-focus-ring': string;
}

const themes: Record<NonNullable<SidebarThemeId>, { light: SidebarThemeVars; dark: SidebarThemeVars }> = {
  blue: {
    light: {
      '--sidebar-bg': 'linear-gradient(to bottom, #93c5fd, #bfdbfe, #dbeafe, #eff6ff)',
      '--sidebar-border': '#93c5fd',
      '--sidebar-icon-bg': '#bfdbfe',
      '--sidebar-icon-bg-hover': '#93c5fd',
      '--sidebar-icon-color': '#1e40af',
      '--sidebar-icon-color-active': '#1d4ed8',
      '--sidebar-text': '#1e3a8a',
      '--sidebar-text-muted': '#3b82f6',
      '--sidebar-link-hover-bg': 'rgba(147, 197, 253, 0.7)',
      '--sidebar-link-active-bg': '#93c5fd',
      '--sidebar-link-active-text': '#1e3a8a',
      '--sidebar-category-text': '#1d4ed8',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-user-card-border': '#93c5fd',
      '--sidebar-button-border': '#93c5fd',
      '--sidebar-button-hover-bg': '#bfdbfe',
      '--sidebar-button-hover-text': '#1d4ed8',
      '--sidebar-focus-ring': 'rgba(29, 78, 216, 0.4)',
    },
    dark: {
      '--sidebar-bg': 'linear-gradient(to bottom, #1e3a8a, #1e40af, #2563eb, #3b82f6)',
      '--sidebar-border': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-icon-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-icon-bg-hover': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-icon-color': 'rgba(255, 255, 255, 0.75)',
      '--sidebar-icon-color-active': '#93c5fd',
      '--sidebar-text': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-text-muted': 'rgba(255, 255, 255, 0.7)',
      '--sidebar-link-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-link-active-bg': 'rgba(147, 197, 253, 0.35)',
      '--sidebar-link-active-text': '#dbeafe',
      '--sidebar-category-text': 'rgba(255, 255, 255, 0.5)',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.06)',
      '--sidebar-user-card-border': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-border': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-button-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-hover-text': '#bfdbfe',
      '--sidebar-focus-ring': 'rgba(147, 197, 253, 0.5)',
    },
  },
  green: {
    light: {
      '--sidebar-bg': 'linear-gradient(to bottom, #86efac, #bbf7d0, #dcfce7, #f0fdf4)',
      '--sidebar-border': '#86efac',
      '--sidebar-icon-bg': '#bbf7d0',
      '--sidebar-icon-bg-hover': '#86efac',
      '--sidebar-icon-color': '#15803d',
      '--sidebar-icon-color-active': '#166534',
      '--sidebar-text': '#14532d',
      '--sidebar-text-muted': '#22c55e',
      '--sidebar-link-hover-bg': 'rgba(134, 239, 172, 0.7)',
      '--sidebar-link-active-bg': '#86efac',
      '--sidebar-link-active-text': '#14532d',
      '--sidebar-category-text': '#166534',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-user-card-border': '#86efac',
      '--sidebar-button-border': '#86efac',
      '--sidebar-button-hover-bg': '#bbf7d0',
      '--sidebar-button-hover-text': '#166534',
      '--sidebar-focus-ring': 'rgba(22, 101, 52, 0.4)',
    },
    dark: {
      '--sidebar-bg': 'linear-gradient(to bottom, #14532d, #166534, #15803d, #22c55e)',
      '--sidebar-border': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-icon-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-icon-bg-hover': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-icon-color': 'rgba(255, 255, 255, 0.75)',
      '--sidebar-icon-color-active': '#86efac',
      '--sidebar-text': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-text-muted': 'rgba(255, 255, 255, 0.7)',
      '--sidebar-link-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-link-active-bg': 'rgba(134, 239, 172, 0.3)',
      '--sidebar-link-active-text': '#dcfce7',
      '--sidebar-category-text': 'rgba(255, 255, 255, 0.5)',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.06)',
      '--sidebar-user-card-border': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-border': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-button-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-hover-text': '#bbf7d0',
      '--sidebar-focus-ring': 'rgba(134, 239, 172, 0.5)',
    },
  },
  violet: {
    light: {
      '--sidebar-bg': 'linear-gradient(to bottom, #c4b5fd, #ddd6fe, #ede9fe, #f5f3ff)',
      '--sidebar-border': '#c4b5fd',
      '--sidebar-icon-bg': '#ddd6fe',
      '--sidebar-icon-bg-hover': '#c4b5fd',
      '--sidebar-icon-color': '#5b21b6',
      '--sidebar-icon-color-active': '#6d28d9',
      '--sidebar-text': '#4c1d95',
      '--sidebar-text-muted': '#7c3aed',
      '--sidebar-link-hover-bg': 'rgba(196, 181, 253, 0.7)',
      '--sidebar-link-active-bg': '#c4b5fd',
      '--sidebar-link-active-text': '#4c1d95',
      '--sidebar-category-text': '#6d28d9',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-user-card-border': '#c4b5fd',
      '--sidebar-button-border': '#c4b5fd',
      '--sidebar-button-hover-bg': '#ddd6fe',
      '--sidebar-button-hover-text': '#6d28d9',
      '--sidebar-focus-ring': 'rgba(109, 40, 217, 0.4)',
    },
    dark: {
      '--sidebar-bg': 'linear-gradient(to bottom, #2e1065, #4c1d95, #5b21b6, #7c3aed)',
      '--sidebar-border': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-icon-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-icon-bg-hover': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-icon-color': 'rgba(255, 255, 255, 0.75)',
      '--sidebar-icon-color-active': '#c4b5fd',
      '--sidebar-text': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-text-muted': 'rgba(255, 255, 255, 0.7)',
      '--sidebar-link-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-link-active-bg': 'rgba(196, 181, 253, 0.3)',
      '--sidebar-link-active-text': '#ede9fe',
      '--sidebar-category-text': 'rgba(255, 255, 255, 0.5)',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.06)',
      '--sidebar-user-card-border': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-border': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-button-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-hover-text': '#ddd6fe',
      '--sidebar-focus-ring': 'rgba(196, 181, 253, 0.5)',
    },
  },
  amber: {
    light: {
      '--sidebar-bg': 'linear-gradient(to bottom, #fcd34d, #fde68a, #fef3c7, #fffbeb)',
      '--sidebar-border': '#fcd34d',
      '--sidebar-icon-bg': '#fde68a',
      '--sidebar-icon-bg-hover': '#fcd34d',
      '--sidebar-icon-color': '#b45309',
      '--sidebar-icon-color-active': '#d97706',
      '--sidebar-text': '#78350f',
      '--sidebar-text-muted': '#d97706',
      '--sidebar-link-hover-bg': 'rgba(252, 211, 77, 0.7)',
      '--sidebar-link-active-bg': '#fcd34d',
      '--sidebar-link-active-text': '#78350f',
      '--sidebar-category-text': '#b45309',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-user-card-border': '#fcd34d',
      '--sidebar-button-border': '#fcd34d',
      '--sidebar-button-hover-bg': '#fde68a',
      '--sidebar-button-hover-text': '#b45309',
      '--sidebar-focus-ring': 'rgba(217, 119, 6, 0.4)',
    },
    dark: {
      '--sidebar-bg': 'linear-gradient(to bottom, #451a03, #78350f, #b45309, #d97706)',
      '--sidebar-border': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-icon-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-icon-bg-hover': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-icon-color': 'rgba(255, 255, 255, 0.75)',
      '--sidebar-icon-color-active': '#fcd34d',
      '--sidebar-text': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-text-muted': 'rgba(255, 255, 255, 0.7)',
      '--sidebar-link-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-link-active-bg': 'rgba(252, 211, 77, 0.25)',
      '--sidebar-link-active-text': '#fffbeb',
      '--sidebar-category-text': 'rgba(255, 255, 255, 0.5)',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.06)',
      '--sidebar-user-card-border': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-border': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-button-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-hover-text': '#fde68a',
      '--sidebar-focus-ring': 'rgba(252, 211, 77, 0.5)',
    },
  },
  rose: {
    light: {
      '--sidebar-bg': 'linear-gradient(to bottom, #fda4af, #fecdd3, #ffe4e6, #fff1f2)',
      '--sidebar-border': '#fda4af',
      '--sidebar-icon-bg': '#fecdd3',
      '--sidebar-icon-bg-hover': '#fda4af',
      '--sidebar-icon-color': '#be123c',
      '--sidebar-icon-color-active': '#e11d48',
      '--sidebar-text': '#9f1239',
      '--sidebar-text-muted': '#f43f5e',
      '--sidebar-link-hover-bg': 'rgba(253, 164, 175, 0.7)',
      '--sidebar-link-active-bg': '#fda4af',
      '--sidebar-link-active-text': '#9f1239',
      '--sidebar-category-text': '#e11d48',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-user-card-border': '#fda4af',
      '--sidebar-button-border': '#fda4af',
      '--sidebar-button-hover-bg': '#fecdd3',
      '--sidebar-button-hover-text': '#e11d48',
      '--sidebar-focus-ring': 'rgba(225, 29, 72, 0.4)',
    },
    dark: {
      '--sidebar-bg': 'linear-gradient(to bottom, #4c0519, #9f1239, #be123c, #f43f5e)',
      '--sidebar-border': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-icon-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-icon-bg-hover': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-icon-color': 'rgba(255, 255, 255, 0.75)',
      '--sidebar-icon-color-active': '#fda4af',
      '--sidebar-text': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-text-muted': 'rgba(255, 255, 255, 0.7)',
      '--sidebar-link-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-link-active-bg': 'rgba(253, 164, 175, 0.25)',
      '--sidebar-link-active-text': '#fff1f2',
      '--sidebar-category-text': 'rgba(255, 255, 255, 0.5)',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.06)',
      '--sidebar-user-card-border': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-border': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-button-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-hover-text': '#fecdd3',
      '--sidebar-focus-ring': 'rgba(253, 164, 175, 0.5)',
    },
  },
  dark: {
    light: {
      '--sidebar-bg': 'linear-gradient(to bottom, #1e293b, #334155, #475569, #64748b)',
      '--sidebar-border': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-icon-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-icon-bg-hover': 'rgba(255, 255, 255, 0.18)',
      '--sidebar-icon-color': 'rgba(255, 255, 255, 0.8)',
      '--sidebar-icon-color-active': '#cbd5e1',
      '--sidebar-text': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-text-muted': 'rgba(255, 255, 255, 0.65)',
      '--sidebar-link-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-link-active-bg': 'rgba(255, 255, 255, 0.2)',
      '--sidebar-link-active-text': '#f1f5f9',
      '--sidebar-category-text': 'rgba(255, 255, 255, 0.5)',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-user-card-border': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-button-border': 'rgba(255, 255, 255, 0.2)',
      '--sidebar-button-hover-bg': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-button-hover-text': '#e2e8f0',
      '--sidebar-focus-ring': 'rgba(203, 213, 225, 0.4)',
    },
    dark: {
      '--sidebar-bg': 'linear-gradient(to bottom, #020617, #0f172a, #1e293b, #334155)',
      '--sidebar-border': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-icon-bg': 'rgba(255, 255, 255, 0.06)',
      '--sidebar-icon-bg-hover': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-icon-color': 'rgba(255, 255, 255, 0.7)',
      '--sidebar-icon-color-active': '#94a3b8',
      '--sidebar-text': 'rgba(255, 255, 255, 0.9)',
      '--sidebar-text-muted': 'rgba(255, 255, 255, 0.6)',
      '--sidebar-link-hover-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-link-active-bg': 'rgba(148, 163, 184, 0.2)',
      '--sidebar-link-active-text': '#e2e8f0',
      '--sidebar-category-text': 'rgba(255, 255, 255, 0.45)',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.05)',
      '--sidebar-user-card-border': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-button-border': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-button-hover-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-button-hover-text': '#cbd5e1',
      '--sidebar-focus-ring': 'rgba(148, 163, 184, 0.4)',
    },
  },
  cyan: {
    light: {
      '--sidebar-bg': 'linear-gradient(to bottom, #67e8f9, #a5f3fc, #cffafe, #ecfeff)',
      '--sidebar-border': '#67e8f9',
      '--sidebar-icon-bg': '#a5f3fc',
      '--sidebar-icon-bg-hover': '#67e8f9',
      '--sidebar-icon-color': '#0e7490',
      '--sidebar-icon-color-active': '#0891b2',
      '--sidebar-text': '#164e63',
      '--sidebar-text-muted': '#06b6d4',
      '--sidebar-link-hover-bg': 'rgba(103, 232, 249, 0.7)',
      '--sidebar-link-active-bg': '#67e8f9',
      '--sidebar-link-active-text': '#164e63',
      '--sidebar-category-text': '#0891b2',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-user-card-border': '#67e8f9',
      '--sidebar-button-border': '#67e8f9',
      '--sidebar-button-hover-bg': '#a5f3fc',
      '--sidebar-button-hover-text': '#0891b2',
      '--sidebar-focus-ring': 'rgba(8, 145, 178, 0.4)',
    },
    dark: {
      '--sidebar-bg': 'linear-gradient(to bottom, #083344, #0e7490, #0891b2, #22d3ee)',
      '--sidebar-border': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-icon-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-icon-bg-hover': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-icon-color': 'rgba(255, 255, 255, 0.75)',
      '--sidebar-icon-color-active': '#67e8f9',
      '--sidebar-text': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-text-muted': 'rgba(255, 255, 255, 0.7)',
      '--sidebar-link-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-link-active-bg': 'rgba(103, 232, 249, 0.3)',
      '--sidebar-link-active-text': '#ecfeff',
      '--sidebar-category-text': 'rgba(255, 255, 255, 0.5)',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.06)',
      '--sidebar-user-card-border': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-border': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-button-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-hover-text': '#a5f3fc',
      '--sidebar-focus-ring': 'rgba(103, 232, 249, 0.5)',
    },
  },
  indigo: {
    light: {
      '--sidebar-bg': 'linear-gradient(to bottom, #818cf8, #a5b4fc, #c7d2fe, #e0e7ff)',
      '--sidebar-border': '#818cf8',
      '--sidebar-icon-bg': '#a5b4fc',
      '--sidebar-icon-bg-hover': '#818cf8',
      '--sidebar-icon-color': '#3730a3',
      '--sidebar-icon-color-active': '#4f46e5',
      '--sidebar-text': '#312e81',
      '--sidebar-text-muted': '#6366f1',
      '--sidebar-link-hover-bg': 'rgba(129, 140, 248, 0.7)',
      '--sidebar-link-active-bg': '#818cf8',
      '--sidebar-link-active-text': '#312e81',
      '--sidebar-category-text': '#4f46e5',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-user-card-border': '#818cf8',
      '--sidebar-button-border': '#818cf8',
      '--sidebar-button-hover-bg': '#a5b4fc',
      '--sidebar-button-hover-text': '#4f46e5',
      '--sidebar-focus-ring': 'rgba(79, 70, 229, 0.4)',
    },
    dark: {
      '--sidebar-bg': 'linear-gradient(to bottom, #1e1b4b, #312e81, #3730a3, #6366f1)',
      '--sidebar-border': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-icon-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-icon-bg-hover': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-icon-color': 'rgba(255, 255, 255, 0.75)',
      '--sidebar-icon-color-active': '#a5b4fc',
      '--sidebar-text': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-text-muted': 'rgba(255, 255, 255, 0.7)',
      '--sidebar-link-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-link-active-bg': 'rgba(129, 140, 248, 0.35)',
      '--sidebar-link-active-text': '#e0e7ff',
      '--sidebar-category-text': 'rgba(255, 255, 255, 0.5)',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.06)',
      '--sidebar-user-card-border': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-border': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-button-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-hover-text': '#c7d2fe',
      '--sidebar-focus-ring': 'rgba(129, 140, 248, 0.5)',
    },
  },
  emerald: {
    light: {
      '--sidebar-bg': 'linear-gradient(to bottom, #6ee7b7, #a7f3d0, #d1fae5, #ecfdf5)',
      '--sidebar-border': '#6ee7b7',
      '--sidebar-icon-bg': '#a7f3d0',
      '--sidebar-icon-bg-hover': '#6ee7b7',
      '--sidebar-icon-color': '#047857',
      '--sidebar-icon-color-active': '#059669',
      '--sidebar-text': '#064e3b',
      '--sidebar-text-muted': '#10b981',
      '--sidebar-link-hover-bg': 'rgba(110, 231, 183, 0.7)',
      '--sidebar-link-active-bg': '#6ee7b7',
      '--sidebar-link-active-text': '#064e3b',
      '--sidebar-category-text': '#059669',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-user-card-border': '#6ee7b7',
      '--sidebar-button-border': '#6ee7b7',
      '--sidebar-button-hover-bg': '#a7f3d0',
      '--sidebar-button-hover-text': '#059669',
      '--sidebar-focus-ring': 'rgba(5, 150, 105, 0.4)',
    },
    dark: {
      '--sidebar-bg': 'linear-gradient(to bottom, #022c22, #064e3b, #047857, #10b981)',
      '--sidebar-border': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-icon-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-icon-bg-hover': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-icon-color': 'rgba(255, 255, 255, 0.75)',
      '--sidebar-icon-color-active': '#6ee7b7',
      '--sidebar-text': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-text-muted': 'rgba(255, 255, 255, 0.7)',
      '--sidebar-link-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-link-active-bg': 'rgba(110, 231, 183, 0.3)',
      '--sidebar-link-active-text': '#ecfdf5',
      '--sidebar-category-text': 'rgba(255, 255, 255, 0.5)',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.06)',
      '--sidebar-user-card-border': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-border': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-button-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-hover-text': '#a7f3d0',
      '--sidebar-focus-ring': 'rgba(110, 231, 183, 0.5)',
    },
  },
  orange: {
    light: {
      '--sidebar-bg': 'linear-gradient(to bottom, #fdba74, #fed7aa, #ffedd5, #fff7ed)',
      '--sidebar-border': '#fdba74',
      '--sidebar-icon-bg': '#fed7aa',
      '--sidebar-icon-bg-hover': '#fdba74',
      '--sidebar-icon-color': '#c2410c',
      '--sidebar-icon-color-active': '#ea580c',
      '--sidebar-text': '#9a3412',
      '--sidebar-text-muted': '#ea580c',
      '--sidebar-link-hover-bg': 'rgba(253, 186, 116, 0.7)',
      '--sidebar-link-active-bg': '#fdba74',
      '--sidebar-link-active-text': '#9a3412',
      '--sidebar-category-text': '#ea580c',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-user-card-border': '#fdba74',
      '--sidebar-button-border': '#fdba74',
      '--sidebar-button-hover-bg': '#fed7aa',
      '--sidebar-button-hover-text': '#ea580c',
      '--sidebar-focus-ring': 'rgba(234, 88, 12, 0.4)',
    },
    dark: {
      '--sidebar-bg': 'linear-gradient(to bottom, #431407, #9a3412, #c2410c, #ea580c)',
      '--sidebar-border': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-icon-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-icon-bg-hover': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-icon-color': 'rgba(255, 255, 255, 0.75)',
      '--sidebar-icon-color-active': '#fdba74',
      '--sidebar-text': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-text-muted': 'rgba(255, 255, 255, 0.7)',
      '--sidebar-link-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-link-active-bg': 'rgba(253, 186, 116, 0.25)',
      '--sidebar-link-active-text': '#fff7ed',
      '--sidebar-category-text': 'rgba(255, 255, 255, 0.5)',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.06)',
      '--sidebar-user-card-border': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-border': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-button-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-hover-text': '#fed7aa',
      '--sidebar-focus-ring': 'rgba(253, 186, 116, 0.5)',
    },
  },
  fuchsia: {
    light: {
      '--sidebar-bg': 'linear-gradient(to bottom, #f0abfc, #f5d0fe, #fae8ff, #fdf4ff)',
      '--sidebar-border': '#f0abfc',
      '--sidebar-icon-bg': '#f5d0fe',
      '--sidebar-icon-bg-hover': '#f0abfc',
      '--sidebar-icon-color': '#86198f',
      '--sidebar-icon-color-active': '#a21caf',
      '--sidebar-text': '#701a75',
      '--sidebar-text-muted': '#c026d3',
      '--sidebar-link-hover-bg': 'rgba(240, 171, 252, 0.7)',
      '--sidebar-link-active-bg': '#f0abfc',
      '--sidebar-link-active-text': '#701a75',
      '--sidebar-category-text': '#a21caf',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-user-card-border': '#f0abfc',
      '--sidebar-button-border': '#f0abfc',
      '--sidebar-button-hover-bg': '#f5d0fe',
      '--sidebar-button-hover-text': '#a21caf',
      '--sidebar-focus-ring': 'rgba(162, 28, 175, 0.4)',
    },
    dark: {
      '--sidebar-bg': 'linear-gradient(to bottom, #4a044e, #701a75, #86198f, #c026d3)',
      '--sidebar-border': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-icon-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-icon-bg-hover': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-icon-color': 'rgba(255, 255, 255, 0.75)',
      '--sidebar-icon-color-active': '#f0abfc',
      '--sidebar-text': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-text-muted': 'rgba(255, 255, 255, 0.7)',
      '--sidebar-link-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-link-active-bg': 'rgba(240, 171, 252, 0.3)',
      '--sidebar-link-active-text': '#fdf4ff',
      '--sidebar-category-text': 'rgba(255, 255, 255, 0.5)',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.06)',
      '--sidebar-user-card-border': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-border': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-button-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-hover-text': '#f5d0fe',
      '--sidebar-focus-ring': 'rgba(240, 171, 252, 0.5)',
    },
  },
  teal: {
    light: {
      '--sidebar-bg': 'linear-gradient(to bottom, #5eead4, #99f6e4, #ccfbf1, #f0fdfa)',
      '--sidebar-border': '#5eead4',
      '--sidebar-icon-bg': '#99f6e4',
      '--sidebar-icon-bg-hover': '#5eead4',
      '--sidebar-icon-color': '#0f766e',
      '--sidebar-icon-color-active': '#0d9488',
      '--sidebar-text': '#134e4a',
      '--sidebar-text-muted': '#14b8a6',
      '--sidebar-link-hover-bg': 'rgba(94, 234, 212, 0.7)',
      '--sidebar-link-active-bg': '#5eead4',
      '--sidebar-link-active-text': '#134e4a',
      '--sidebar-category-text': '#0d9488',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-user-card-border': '#5eead4',
      '--sidebar-button-border': '#5eead4',
      '--sidebar-button-hover-bg': '#99f6e4',
      '--sidebar-button-hover-text': '#0d9488',
      '--sidebar-focus-ring': 'rgba(13, 148, 136, 0.4)',
    },
    dark: {
      '--sidebar-bg': 'linear-gradient(to bottom, #042f2e, #134e4a, #0f766e, #14b8a6)',
      '--sidebar-border': 'rgba(255, 255, 255, 0.12)',
      '--sidebar-icon-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-icon-bg-hover': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-icon-color': 'rgba(255, 255, 255, 0.75)',
      '--sidebar-icon-color-active': '#5eead4',
      '--sidebar-text': 'rgba(255, 255, 255, 0.95)',
      '--sidebar-text-muted': 'rgba(255, 255, 255, 0.7)',
      '--sidebar-link-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-link-active-bg': 'rgba(94, 234, 212, 0.3)',
      '--sidebar-link-active-text': '#f0fdfa',
      '--sidebar-category-text': 'rgba(255, 255, 255, 0.5)',
      '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.06)',
      '--sidebar-user-card-border': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-border': 'rgba(255, 255, 255, 0.15)',
      '--sidebar-button-hover-bg': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-button-hover-text': '#99f6e4',
      '--sidebar-focus-ring': 'rgba(94, 234, 212, 0.5)',
    },
  },
};

/**
 * Variáveis globais do app (HSL sem "hsl()") para Tailwind.
 * Aplicadas no Layout quando aluno tem tema da loja selecionado.
 */
export interface GlobalThemeVars {
  '--primary': string;
  '--primary-foreground': string;
  '--ring': string;
  '--accent': string;
  '--accent-foreground': string;
}

const globalThemes: Record<NonNullable<SidebarThemeId>, { light: GlobalThemeVars; dark: GlobalThemeVars }> = {
  blue: {
    light: { '--primary': '217 91% 50%', '--primary-foreground': '210 40% 98%', '--ring': '217 91% 50%', '--accent': '214 95% 93%', '--accent-foreground': '222 47% 11%' },
    dark: { '--primary': '217 91% 60%', '--primary-foreground': '210 40% 98%', '--ring': '217 91% 60%', '--accent': '217 33% 17%', '--accent-foreground': '210 40% 98%' },
  },
  green: {
    light: { '--primary': '142 71% 45%', '--primary-foreground': '355 7% 97%', '--ring': '142 71% 45%', '--accent': '138 76% 97%', '--accent-foreground': '144 61% 20%' },
    dark: { '--primary': '142 71% 55%', '--primary-foreground': '355 7% 97%', '--ring': '142 71% 55%', '--accent': '142 30% 18%', '--accent-foreground': '210 40% 98%' },
  },
  violet: {
    light: { '--primary': '263 70% 50%', '--primary-foreground': '210 40% 98%', '--ring': '263 70% 50%', '--accent': '263 84% 95%', '--accent-foreground': '263 47% 24%' },
    dark: { '--primary': '263 70% 65%', '--primary-foreground': '210 40% 98%', '--ring': '263 70% 65%', '--accent': '263 30% 18%', '--accent-foreground': '210 40% 98%' },
  },
  amber: {
    light: { '--primary': '32 95% 44%', '--primary-foreground': '48 96% 12%', '--ring': '32 95% 44%', '--accent': '48 96% 96%', '--accent-foreground': '32 95% 22%' },
    dark: { '--primary': '43 96% 56%', '--primary-foreground': '24 10% 10%', '--ring': '43 96% 56%', '--accent': '32 28% 18%', '--accent-foreground': '48 96% 89%' },
  },
  rose: {
    light: { '--primary': '347 77% 50%', '--primary-foreground': '355 7% 97%', '--ring': '347 77% 50%', '--accent': '350 100% 97%', '--accent-foreground': '348 63% 26%' },
    dark: { '--primary': '347 77% 60%', '--primary-foreground': '355 7% 97%', '--ring': '347 77% 60%', '--accent': '347 30% 18%', '--accent-foreground': '210 40% 98%' },
  },
  dark: {
    light: { '--primary': '215 28% 40%', '--primary-foreground': '210 40% 98%', '--ring': '215 28% 40%', '--accent': '215 25% 92%', '--accent-foreground': '215 28% 17%' },
    dark: { '--primary': '215 20% 55%', '--primary-foreground': '220 15% 10%', '--ring': '215 20% 55%', '--accent': '215 20% 14%', '--accent-foreground': '210 20% 98%' },
  },
  cyan: {
    light: { '--primary': '189 94% 43%', '--primary-foreground': '210 40% 98%', '--ring': '189 94% 43%', '--accent': '186 93% 96%', '--accent-foreground': '192 80% 20%' },
    dark: { '--primary': '189 94% 53%', '--primary-foreground': '210 40% 98%', '--ring': '189 94% 53%', '--accent': '189 40% 18%', '--accent-foreground': '210 40% 98%' },
  },
  indigo: {
    light: { '--primary': '239 84% 67%', '--primary-foreground': '210 40% 98%', '--ring': '239 84% 67%', '--accent': '238 75% 95%', '--accent-foreground': '243 47% 25%' },
    dark: { '--primary': '239 84% 67%', '--primary-foreground': '210 40% 98%', '--ring': '239 84% 67%', '--accent': '239 35% 18%', '--accent-foreground': '210 40% 98%' },
  },
  emerald: {
    light: { '--primary': '160 84% 39%', '--primary-foreground': '355 7% 97%', '--ring': '160 84% 39%', '--accent': '152 76% 96%', '--accent-foreground': '158 64% 18%' },
    dark: { '--primary': '160 84% 49%', '--primary-foreground': '355 7% 97%', '--ring': '160 84% 49%', '--accent': '160 35% 18%', '--accent-foreground': '210 40% 98%' },
  },
  orange: {
    light: { '--primary': '25 95% 53%', '--primary-foreground': '60 9% 10%', '--ring': '25 95% 53%', '--accent': '34 100% 96%', '--accent-foreground': '24 95% 25%' },
    dark: { '--primary': '25 95% 53%', '--primary-foreground': '60 9% 10%', '--ring': '25 95% 53%', '--accent': '25 35% 18%', '--accent-foreground': '34 96% 92%' },
  },
  fuchsia: {
    light: { '--primary': '292 84% 61%', '--primary-foreground': '210 40% 98%', '--ring': '292 84% 61%', '--accent': '295 100% 97%', '--accent-foreground': '292 60% 28%' },
    dark: { '--primary': '292 84% 61%', '--primary-foreground': '210 40% 98%', '--ring': '292 84% 61%', '--accent': '292 35% 18%', '--accent-foreground': '210 40% 98%' },
  },
  teal: {
    light: { '--primary': '173 80% 40%', '--primary-foreground': '210 40% 98%', '--ring': '173 80% 40%', '--accent': '166 76% 96%', '--accent-foreground': '172 66% 20%' },
    dark: { '--primary': '173 80% 50%', '--primary-foreground': '220 15% 10%', '--ring': '173 80% 50%', '--accent': '173 35% 18%', '--accent-foreground': '210 40% 98%' },
  },
};

/**
 * Retorna variáveis CSS globais (primary, ring, accent) para aplicar no Layout
 * e assim mudar a cor de botões/links/foco em todas as páginas.
 * Retorna objeto vazio se themeId for null (não aplicar override).
 */
export function getGlobalThemeStyles(
  themeId: SidebarThemeId,
  isDarkMode: boolean
): Record<string, string> {
  if (!themeId || !globalThemes[themeId]) return {};
  const vars = isDarkMode ? globalThemes[themeId].dark : globalThemes[themeId].light;
  return { ...vars };
}

/** Padrão quando não há tema da loja (sidebar roxa original) */
const defaultLight: SidebarThemeVars = {
  '--sidebar-bg': 'linear-gradient(to bottom, #c9a8ec, #d6c0f2, #e2d4f7, #ede5fa)',
  '--sidebar-border': '#c9b5e0',
  '--sidebar-icon-bg': '#e0d0f2',
  '--sidebar-icon-bg-hover': '#d4bceb',
  '--sidebar-icon-color': '#5a3d8a',
  '--sidebar-icon-color-active': '#7B3FE4',
  '--sidebar-text': '#1e293b',
  '--sidebar-text-muted': '#64748b',
  '--sidebar-link-hover-bg': 'rgba(212, 188, 235, 0.9)',
  '--sidebar-link-active-bg': '#d4bceb',
  '--sidebar-link-active-text': '#1B1F4A',
  '--sidebar-category-text': '#5a3d8a',
  '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.95)',
  '--sidebar-user-card-border': '#c9b5e0',
  '--sidebar-button-border': '#c9b5e0',
  '--sidebar-button-hover-bg': '#d4bceb',
  '--sidebar-button-hover-text': '#7B3FE4',
  '--sidebar-focus-ring': 'rgba(123, 63, 228, 0.4)',
};

const defaultDark: SidebarThemeVars = {
  '--sidebar-bg': 'linear-gradient(to bottom, #0B0F2B, #070A1E, #050617)',
  '--sidebar-border': 'rgba(167, 139, 250, 0.25)',
  '--sidebar-icon-bg': 'rgba(139, 92, 246, 0.15)',
  '--sidebar-icon-bg-hover': 'rgba(167, 139, 250, 0.25)',
  '--sidebar-icon-color': '#a78bfa',
  '--sidebar-icon-color-active': '#c4b5fd',
  '--sidebar-text': 'rgba(255, 255, 255, 0.95)',
  '--sidebar-text-muted': 'rgba(196, 181, 253, 0.8)',
  '--sidebar-link-hover-bg': 'rgba(167, 139, 250, 0.15)',
  '--sidebar-link-active-bg': 'rgba(139, 92, 246, 0.3)',
  '--sidebar-link-active-text': '#ede9fe',
  '--sidebar-category-text': 'rgba(196, 181, 253, 0.7)',
  '--sidebar-user-card-bg': 'rgba(255, 255, 255, 0.05)',
  '--sidebar-user-card-border': 'rgba(167, 139, 250, 0.2)',
  '--sidebar-button-border': 'rgba(167, 139, 250, 0.4)',
  '--sidebar-button-hover-bg': 'rgba(139, 92, 246, 0.2)',
  '--sidebar-button-hover-text': '#c4b5fd',
  '--sidebar-focus-ring': 'rgba(139, 92, 246, 0.5)',
};

export function getSidebarThemeStyles(
  themeId: SidebarThemeId,
  isDarkMode: boolean
): Record<string, string> {
  const vars = themeId && themes[themeId]
    ? (isDarkMode ? themes[themeId].dark : themes[themeId].light)
    : (isDarkMode ? defaultDark : defaultLight);
  return vars;
}
