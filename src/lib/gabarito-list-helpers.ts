import type { Gabarito, GabaritoGeneration, GabaritoScopeClassEntry } from '@/types/answer-sheet';

export type GabaritoDownloadTarget = { url: string; needsAuth: boolean };

export function scopeTypeLabel(t?: string) {
  switch (t) {
    case 'class':
      return 'Turma';
    case 'grade':
      return 'Série';
    case 'school':
      return 'Escola';
    case 'city':
      return 'Município';
    default:
      return t ?? 'Escopo';
  }
}

function classEntryLabel(item: string | GabaritoScopeClassEntry): string {
  if (typeof item === 'string') {
    return item;
  }
  if (item.label && item.label.trim()) {
    return item.label.trim();
  }
  const parts = [item.grade_name, item.class_name].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' - ');
  }
  return item.class_id;
}

/** Rótulos legíveis das turmas no snapshot (ordem preservada) */
export function generationClassLabelsFromSnapshot(gen: GabaritoGeneration): string[] {
  const s = gen.scope_snapshot;
  if (!s || typeof s !== 'object' || !Array.isArray(s.class_ids)) {
    return [];
  }
  return s.class_ids.map(classEntryLabel).filter(Boolean);
}

export function formatGenerationScopeSummary(gen: GabaritoGeneration): string {
  const s = gen.scope_snapshot;
  if (!s || typeof s !== 'object') {
    return scopeTypeLabel(gen.scope_type);
  }

  const labels = generationClassLabelsFromSnapshot(gen);
  if (labels.length > 0) {
    const shown = labels.length <= 4 ? labels.join(', ') : `${labels.slice(0, 3).join(', ')} +${labels.length - 3}`;
    return `${scopeTypeLabel(gen.scope_type)} · ${shown}`;
  }

  const parts: string[] = [];
  if (Array.isArray(s.class_ids) && s.class_ids.length > 0) {
    parts.push(`${s.class_ids.length} turma(s)`);
  }
  const gradeIds = s.grade_ids as string[] | undefined;
  if (Array.isArray(gradeIds) && gradeIds.length > 0) {
    parts.push(`${gradeIds.length} série(s)`);
  }
  const schoolIds = s.school_ids as string[] | undefined;
  if (Array.isArray(schoolIds) && schoolIds.length > 0) {
    parts.push(`${schoolIds.length} escola(s)`);
  }
  if (parts.length > 0) {
    return `${scopeTypeLabel(gen.scope_type)} · ${parts.join(' · ')}`;
  }
  return scopeTypeLabel(gen.scope_type);
}

/** MinIO / URL pública primeiro; `download_url` da API exige token (needsAuth: true). */
export function resolveGenerationDownloadTarget(gen: GabaritoGeneration): GabaritoDownloadTarget | null {
  const m = gen.minio_url?.trim();
  if (m) return { url: m, needsAuth: false };
  const d = gen.download_url?.trim();
  if (d) return { url: d, needsAuth: true };
  return null;
}

export function resolveGenerationDownloadUrl(gen: GabaritoGeneration): string | null {
  return resolveGenerationDownloadTarget(gen)?.url ?? null;
}

/** Cartão na listagem: minio sem auth; download_url com auth. */
export function resolveGabaritoRootDownload(
  g: Pick<Gabarito, 'minio_url' | 'download_url'>
): GabaritoDownloadTarget | null {
  const m = g.minio_url?.trim();
  if (m) return { url: m, needsAuth: false };
  const d = g.download_url?.trim();
  if (d) return { url: d, needsAuth: true };
  return null;
}

export function generationCanDownload(gen: GabaritoGeneration): boolean {
  if (gen.can_download === false) return false;
  if (gen.can_download === true) return true;
  if (gen.status === 'completed') {
    return !!resolveGenerationDownloadTarget(gen) || !!gen.job_id;
  }
  return false;
}

export function gabaritoDownloadLoadingKey(gabaritoId: string, generationId?: string): string {
  return generationId ? `${gabaritoId}__${generationId}` : gabaritoId;
}
