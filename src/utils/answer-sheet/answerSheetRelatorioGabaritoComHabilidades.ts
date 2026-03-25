import { api } from "@/lib/api";

/** Item de `gabaritos` em GET `/answer-sheets/opcoes-filtros-results` (campos extras podem vir do backend). */
export type GabaritoOpcaoFiltrosResults = { id: string } & Record<string, unknown>;

function hasLinkedSkillsFromGabaritoRecord(raw: Record<string, unknown>): boolean {
  if (raw.tem_habilidades === true || raw.habilidades_vinculadas === true) return true;
  const n = Number(
    raw.total_habilidades ??
      raw.habilidades_count ??
      raw.skills_count ??
      raw.total_habilidades_vinculadas ??
      raw.habilidades_vinculadas_count
  );
  if (Number.isFinite(n) && n > 0) return true;

  const qs = raw.question_skills;
  if (qs && typeof qs === "object" && !Array.isArray(qs)) {
    return Object.values(qs as Record<string, unknown>).some(
      (v) => Array.isArray(v) && v.length > 0
    );
  }
  return false;
}

/** `true` / `false` = backend informou; `null` = não dá para saber só pelo item da opção. */
function opcaoIndicaHabilidades(g: GabaritoOpcaoFiltrosResults): boolean | null {
  if (g.tem_habilidades === false && g.habilidades_vinculadas === false) return false;
  if (g.tem_habilidades === true || g.habilidades_vinculadas === true) return true;
  const n = Number(
    g.total_habilidades ?? g.habilidades_count ?? g.skills_count ?? g.total_habilidades_vinculadas
  );
  if (Number.isFinite(n)) return n > 0;
  const qs = g.question_skills;
  if (qs && typeof qs === "object" && !Array.isArray(qs)) {
    const vals = Object.values(qs as Record<string, unknown>);
    if (vals.length === 0) return null;
    const has = vals.some((v) => Array.isArray(v) && v.length > 0);
    return has ? true : false;
  }
  return null;
}

async function fetchGabaritoIdsComHabilidadesVinculadas(): Promise<Set<string> | null> {
  try {
    const res = await api.get<{ gabaritos?: Record<string, unknown>[] }>("/answer-sheets/gabaritos");
    const ids = new Set<string>();
    for (const raw of res.data?.gabaritos ?? []) {
      if (!raw || typeof raw !== "object") continue;
      const id = String((raw as { id?: unknown }).id ?? "");
      if (!id) continue;
      if (hasLinkedSkillsFromGabaritoRecord(raw as Record<string, unknown>)) ids.add(id);
    }
    return ids;
  } catch {
    return null;
  }
}

/**
 * Mantém apenas cartões resposta com ao menos uma habilidade vinculada a alguma questão
 * (ou flag numérica/booleana equivalente vinda da API).
 * Usado no Relatório Escolar (cartão).
 */
export async function filtrarGabaritosOpcoesSomenteComHabilidadesVinculadas(
  gabaritos: GabaritoOpcaoFiltrosResults[]
): Promise<GabaritoOpcaoFiltrosResults[]> {
  if (gabaritos.length === 0) return [];

  const unknown = gabaritos.filter((g) => opcaoIndicaHabilidades(g) === null);
  if (unknown.length === 0) {
    return gabaritos.filter((g) => opcaoIndicaHabilidades(g) === true);
  }

  const idSet = await fetchGabaritoIdsComHabilidadesVinculadas();
  if (idSet === null) {
    return gabaritos;
  }
  if (idSet.size === 0) {
    // Lista de gabaritos não expõe habilidades: não dá para filtrar por id — remove só quem veio explícito sem habilidades.
    return gabaritos.filter((g) => opcaoIndicaHabilidades(g) !== false);
  }
  return gabaritos.filter((g) => {
    const v = opcaoIndicaHabilidades(g);
    if (v === true) return true;
    if (v === false) return false;
    return idSet.has(String(g.id));
  });
}
