/** Extrai id de professor/usuário em respostas típicas de POST /teacher */
export function teacherIdFromCreateResponse(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  const direct = d.id ?? d.user_id ?? d.teacher_id;
  if (direct != null && String(direct).length > 0) return String(direct);
  const nested = d.professor ?? d.usuario ?? d.user;
  if (nested && typeof nested === "object") {
    const nid = (nested as Record<string, unknown>).id;
    if (nid != null && String(nid).length > 0) return String(nid);
  }
  return undefined;
}
