import type { UserHierarchyContext } from '@/utils/userHierarchy';

export type InstitutionalGranularity = 'municipio' | 'escola' | 'serie' | 'turma' | 'avaliacao';

/** Linha mínima para cruzar com hierarquia (mesmo contrato de `ClassSummaryRow` no relatório escolar). */
export interface InstitutionalRankingFilterRow {
  turma: string;
  serie: string;
  escola_id?: string;
}

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function normAggKey(s?: string | null): string {
  return normalizeText((s ?? '').trim()).replace(/\s+/g, ' ');
}

function professorInstitutionalRowAllowed(
  row: InstitutionalRankingFilterRow,
  granularidade: InstitutionalGranularity | undefined,
  municipalLike: boolean,
  classes: NonNullable<UserHierarchyContext['classes']>
): boolean {
  const rT = normAggKey(row.turma);
  const rS = normAggKey(row.serie);

  if (municipalLike || granularidade === 'municipio') {
    const schools = new Set(classes.map((c) => normAggKey(c.school_name)));
    return schools.has(rT);
  }

  return classes.some((c) => {
    const gK = normAggKey(c.grade_name);
    const cK = normAggKey(c.class_name);

    if (granularidade === 'escola') {
      if (rT.includes(' - ')) {
        const parts = rT.split(' - ').map((p) => normAggKey(p));
        if (parts.length >= 2) return parts[0] === gK && parts[1] === cK;
      }
      if (rT === gK || rS === gK) {
        return classes.some((x) => normAggKey(x.grade_name) === gK);
      }
      return cK === rT && (!gK || gK === rS || !rS);
    }

    if (granularidade === 'serie') {
      return gK === rS && cK === rT;
    }

    if (granularidade === 'turma' || granularidade === 'avaliacao') {
      return cK === rT && (!gK || gK === rS);
    }

    return cK === rT;
  });
}

/**
 * Restringe linhas agregadas (escola / série / turma) ao que cada papel pode ver:
 * - admin / tecadm: todas as linhas retornadas pelos filtros
 * - diretor / coordenador: no recorte municipal, só a própria escola
 * - professor: só séries/turmas do vínculo
 */
export function filterInstitutionalRankingRowsByRoleAccess<T extends InstitutionalRankingFilterRow>(
  rows: T[],
  opts: {
    role?: string;
    hierarchy: UserHierarchyContext | null;
    granularidade?: InstitutionalGranularity;
    isMunicipalView: boolean;
  }
): T[] {
  const { role, hierarchy, granularidade, isMunicipalView } = opts;
  if (!role || role === 'admin') return rows;
  if (role === 'tecadm') return rows;

  const g: InstitutionalGranularity = granularidade ?? (isMunicipalView ? 'municipio' : 'turma');
  const municipalLike = isMunicipalView || g === 'municipio';

  if (role === 'diretor' || role === 'coordenador') {
    const sid = hierarchy?.school?.id;
    const sname = hierarchy?.school?.name;
    if (!sid && !sname) return rows;
    if (municipalLike || g === 'municipio') {
      return rows.filter((r) => {
        if (sid && r.escola_id && String(r.escola_id) === String(sid)) return true;
        if (sname && normAggKey(r.turma) === normAggKey(sname)) return true;
        return false;
      });
    }
    return rows;
  }

  if (role === 'professor') {
    const classes = hierarchy?.classes;
    if (!classes?.length) return [];
    return rows.filter((r) => professorInstitutionalRowAllowed(r, g, municipalLike, classes));
  }

  return rows;
}

export function institutionalRankingScore(row: {
  mediaGeral?: number;
  proficiencia?: number;
  proficienciaMedia?: number;
  proficiency?: number;
}): number {
  const m = row.mediaGeral;
  if (m != null && Number.isFinite(Number(m))) return Number(m);
  const p = row.proficienciaMedia ?? row.proficiencia ?? row.proficiency;
  if (p != null && Number.isFinite(Number(p))) return Number(p);
  return Number.NEGATIVE_INFINITY;
}

export function sortInstitutionalRowsByPerformance<
  T extends { mediaGeral?: number; proficiencia?: number; proficienciaMedia?: number; proficiency?: number },
>(rows: T[]): T[] {
  return rows.slice().sort((a, b) => institutionalRankingScore(b) - institutionalRankingScore(a));
}
