const KEY_PREFIX = 'onboarding_completed_';

export function getOnboardingCompleted(userId: string | null): boolean {
  if (!userId) return true; // sem usuário = não mostrar onboarding
  try {
    return localStorage.getItem(KEY_PREFIX + userId) === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingCompleted(userId: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + userId, 'true');
  } catch (e) {
    console.warn('Erro ao salvar onboarding:', e);
  }
}
