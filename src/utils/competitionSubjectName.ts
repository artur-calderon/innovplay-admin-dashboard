/**
 * Resolve o nome da disciplina para competições/templates quando subject_name vem null da API.
 * Busca o nome em uma lista de disciplinas (subjects) pelo subject_id.
 */

export interface SubjectOption {
  id: string;
  name: string;
}

/**
 * Retorna o nome da disciplina para exibição.
 * Se subject_name estiver preenchido, usa; senão procura em subjects pelo subject_id.
 */
export function getCompetitionSubjectDisplay(
  item: { subject_id: string; subject_name?: string | null },
  subjects?: SubjectOption[] | null,
): string {
  if (item.subject_name) return item.subject_name;
  if (subjects?.length && item.subject_id) {
    const found = subjects.find((s) => s.id === item.subject_id);
    if (found?.name) return found.name;
  }
  return item.subject_id;
}

/**
 * Enriquece um item (competição ou template) com subject_name quando estiver vazio,
 * usando a lista de disciplinas.
 */
export function enrichWithSubjectName<T extends { subject_id: string; subject_name?: string | null }>(
  item: T,
  subjects: SubjectOption[],
): T {
  if (item.subject_name) return item;
  const name = subjects.find((s) => s.id === item.subject_id)?.name;
  if (!name) return item;
  return { ...item, subject_name: name };
}

/**
 * Enriquece uma lista de itens com subject_name quando estiver vazio.
 */
export function enrichListWithSubjectName<
  T extends { subject_id: string; subject_name?: string | null },
>(list: T[], subjects: SubjectOption[]): T[] {
  if (!subjects.length) return list;
  return list.map((item) => enrichWithSubjectName(item, subjects));
}
