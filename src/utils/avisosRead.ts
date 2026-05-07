import type { Aviso } from '@/types/avisos';

/**
 * Indica se o aviso deve aparecer como "não lido" para o usuário atual.
 * Evita badge/modal tratando próprios comunicados como notificação;
 * usa leitura do servidor e espelho em localStorage.
 */
export function computeAvisoUnread(
  aviso: Aviso,
  currentUserId: string | undefined,
  isLocallyRead: (avisoId: string) => boolean
): boolean {
  const mine =
    !!currentUserId &&
    !!aviso.autor_id &&
    String(aviso.autor_id) === String(currentUserId);
  if (mine) return false;
  if (aviso.readOnServer === true) return false;
  return !isLocallyRead(aviso.id);
}
