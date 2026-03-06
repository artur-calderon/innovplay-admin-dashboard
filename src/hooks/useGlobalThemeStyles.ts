import { useState, useEffect } from 'react';
import { useAuth } from '@/context/authContext';
import { useStudentPreferences } from '@/context/StudentPreferencesContext';
import {
  getGlobalThemeStyles,
  getNonStudentSidebarThemeFromStorage,
  SIDEBAR_THEME_CHANGE_EVENT,
} from '@/constants/sidebarThemes';
import type { SidebarThemeId } from '@/constants/sidebarThemes';

/**
 * Retorna os estilos de variáveis CSS do tema global (primary, ring, accent)
 * para aplicar no root de qualquer página. Usado em Layout, FullscreenLayout
 * e em páginas que não usam Layout (ex.: ChangePassword).
 */
export function useGlobalThemeStyles(): Record<string, string> {
  const { user } = useAuth();
  const studentPrefs = useStudentPreferences();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [nonStudentThemeId, setNonStudentThemeId] = useState<SidebarThemeId>(null);

  const sidebarThemeId = (user?.role === 'aluno'
    ? (studentPrefs?.preferences?.sidebar_theme_id ?? null)
    : nonStudentThemeId) as SidebarThemeId;

  const globalThemeStyles = sidebarThemeId
    ? getGlobalThemeStyles(sidebarThemeId, isDarkMode)
    : {};

  useEffect(() => {
    const checkDarkMode = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (user?.role !== 'aluno') {
      setNonStudentThemeId(getNonStudentSidebarThemeFromStorage());
      const onThemeChange = () => setNonStudentThemeId(getNonStudentSidebarThemeFromStorage());
      window.addEventListener(SIDEBAR_THEME_CHANGE_EVENT, onThemeChange);
      return () => window.removeEventListener(SIDEBAR_THEME_CHANGE_EVENT, onThemeChange);
    }
  }, [user?.role]);

  return globalThemeStyles;
}
