export const getBulletinStatsStorageKey = (evaluationId: string, studentId: string) =>
  `bulletin-stats:${evaluationId}:${studentId}`;

export const saveBulletinStatsToStorage = <T extends Record<string, unknown>>(
  evaluationId: string,
  studentId: string,
  stats: T
) => {
  if (typeof window === 'undefined') return;
  try {
    const key = getBulletinStatsStorageKey(evaluationId, studentId);
    sessionStorage.setItem(key, JSON.stringify(stats));
  } catch (error) {
    console.warn('Não foi possível salvar estatísticas do boletim no sessionStorage:', error);
  }
};

export const loadBulletinStatsFromStorage = <T>(
  evaluationId: string,
  studentId: string
): T | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const key = getBulletinStatsStorageKey(evaluationId, studentId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn('Não foi possível carregar estatísticas do boletim do sessionStorage:', error);
    return undefined;
  }
};

export const clearBulletinStatsFromStorage = (evaluationId: string, studentId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const key = getBulletinStatsStorageKey(evaluationId, studentId);
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn('Não foi possível limpar estatísticas do boletim no sessionStorage:', error);
  }
};
