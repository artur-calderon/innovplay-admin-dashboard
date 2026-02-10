/**
 * Modal para seleção múltipla de itens de escopo (turma, escola, estado, município)
 * com cards informativos e filtros para facilitar a busca.
 * - Turma: filtro por escola e por série (só séries do nível da competição).
 * - Escola: filtro por estado e município.
 * - Município: filtro por estado.
 * - Estado: sem filtro.
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { Loader2, Search, CheckCircle2 } from 'lucide-react';

export type ScopeFilterKind = 'turma' | 'escola' | 'estado' | 'municipio';

export interface ScopeFilterItem {
  id: string;
  name: string;
  subtitle?: string;
  meta?: string;
}

interface ScopeFilterSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
  kind: ScopeFilterKind;
  selectedIds: string[];
  /** Nível da competição (1 ou 2): turmas só mostram séries deste nível. */
  competitionLevel?: 1 | 2;
  /** Apenas para kind === 'municipio': nome do estado já selecionado. */
  stateNameForMunicipio?: string;
  /** Para kind === 'turma': estado pré-selecionado (nome) conforme role (tec adm, diretor, etc.). */
  initialStateForTurma?: string;
  /** Para kind === 'turma': município pré-selecionado (id) conforme role. */
  initialMunicipalityIdForTurma?: string;
}

const KIND_LABELS: Record<ScopeFilterKind, string> = {
  turma: 'Turmas',
  escola: 'Escolas',
  estado: 'Estados',
  municipio: 'Municípios',
};

/** Nível 1 = Ed. Infantil, Anos Iniciais, EJA, Ed. Especial | Nível 2 = Anos Finais, Ensino Médio */
function gradeBelongsToLevel(educationStageName: string | undefined, level: 1 | 2): boolean {
  if (!educationStageName) return true;
  const name = educationStageName.toLowerCase();
  if (level === 1) {
    return (
      name.includes('infantil') ||
      name.includes('iniciais') ||
      name.includes('eja') ||
      name.includes('especial')
    );
  }
  return name.includes('finais') || name.includes('médio') || name.includes('medio');
}

/** Busca turmas: só as que pertencem a séries do nível informado. */
async function fetchClassesForLevel(
  level: 1 | 2,
  schoolId?: string,
  gradeId?: string
): Promise<ScopeFilterItem[]> {
  const [gradesRes, classesRes] = await Promise.all([
    api.get<Array<{ id: string; name: string; education_stage?: { name?: string } }>>(
      '/evaluation-results/grades'
    ),
    schoolId
      ? api.get<Array<{ id: string; name: string; school?: { name?: string }; grade?: { id?: string; name?: string } }>>(
          `/classes/school/${schoolId}`
        )
      : api.get<Array<{ id: string; name: string; school?: { name?: string }; grade?: { id?: string; name?: string } }>>(
          '/classes',
          { params: { per_page: 500 } }
        ),
  ]);
  const grades = Array.isArray(gradesRes.data) ? gradesRes.data : [];
  const gradeIdsOfLevel = new Set(
    grades
      .filter((g) => gradeBelongsToLevel(g.education_stage?.name, level))
      .map((g) => g.id)
  );
  const rawClasses = Array.isArray(classesRes.data) ? classesRes.data : [];
  let filtered = rawClasses.filter((c) => {
    const gid = c.grade?.id ?? (c as { grade_id?: string }).grade_id;
    return gid && gradeIdsOfLevel.has(gid);
  });
  if (gradeId) filtered = filtered.filter((c) => (c.grade?.id ?? (c as { grade_id?: string }).grade_id) === gradeId);
  return filtered.map((c) => ({
    id: c.id,
    name: c.name ?? c.id,
    subtitle: [c.school?.name, c.grade?.name].filter(Boolean).join(' · ') || undefined,
  }));
}

/** Busca itens conforme o tipo. */
async function fetchScopeItems(
  kind: ScopeFilterKind,
  opts: {
    stateName?: string;
    municipalityId?: string;
    competitionLevel?: 1 | 2;
    schoolId?: string;
    gradeId?: string;
  }
): Promise<ScopeFilterItem[]> {
  if (kind === 'municipio') {
    if (!opts.stateName?.trim()) return [];
    const { data } = await api.get<Array<{ id: string; name: string }>>(
      `/city/municipalities/state/${encodeURIComponent(opts.stateName)}`
    );
    const raw = Array.isArray(data) ? data : [];
    return raw.map((m) => ({ id: m.id, name: m.name ?? m.id, meta: opts.stateName }));
  }

  if (kind === 'estado') {
    const { data } = await api.get<Array<{ id: string; name: string; uf?: string }>>('/city/states');
    const raw = Array.isArray(data) ? data : [];
    return raw.map((s) => ({
      id: s.id,
      name: s.name ?? s.id,
      subtitle: s.uf ? `UF: ${s.uf}` : undefined,
    }));
  }

  if (kind === 'turma' && opts.competitionLevel) {
    // Só carrega turmas quando há município selecionado (escolas do município), para não misturar outros estados
    if (!opts.municipalityId) return [];
    if (opts.schoolId) {
      return fetchClassesForLevel(opts.competitionLevel, opts.schoolId, opts.gradeId);
    }
    const { data: schoolsData } = await api.get<Array<{ id: string }>>(`/school/city/${opts.municipalityId}`);
    const schoolIds = Array.isArray(schoolsData) ? schoolsData.map((s) => s.id) : [];
    const allClasses: ScopeFilterItem[] = [];
    for (const sid of schoolIds) {
      const list = await fetchClassesForLevel(opts.competitionLevel!, sid, opts.gradeId);
      allClasses.push(...list);
    }
    const seen = new Set<string>();
    return allClasses.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }

  if (kind === 'escola') {
    if (opts.municipalityId) {
      const { data } = await api.get<Array<{ id: string; name: string; city?: { name?: string } }>>(
        `/school/city/${opts.municipalityId}`
      );
      const raw = Array.isArray(data) ? data : [];
      return raw.map((s) => ({
        id: s.id,
        name: s.name ?? s.id,
        subtitle: (s.city as { name?: string })?.name,
      }));
    }
    // Estado selecionado: carregar todos os municípios do estado e depois todas as escolas de cada um
    if (!opts.stateName?.trim()) return [];
    const { data: municipalitiesData } = await api.get<Array<{ id: string; name: string }>>(
      `/city/municipalities/state/${encodeURIComponent(opts.stateName)}`
    );
    const municipalities = Array.isArray(municipalitiesData) ? municipalitiesData : [];
    const allSchools: ScopeFilterItem[] = [];
    const seenIds = new Set<string>();
    for (const mun of municipalities) {
      const { data: schoolsData } = await api.get<Array<{ id: string; name: string; city?: { name?: string } }>>(
        `/school/city/${mun.id}`
      );
      const raw = Array.isArray(schoolsData) ? schoolsData : [];
      for (const s of raw) {
        if (seenIds.has(s.id)) continue;
        seenIds.add(s.id);
        allSchools.push({
          id: s.id,
          name: s.name ?? s.id,
          subtitle: (s.city as { name?: string })?.name ?? mun.name,
        });
      }
    }
    return allSchools;
  }

  return [];
}

export function ScopeFilterSelectionModal({
  open,
  onClose,
  onConfirm,
  kind,
  selectedIds,
  competitionLevel = 1,
  stateNameForMunicipio,
  initialStateForTurma,
  initialMunicipalityIdForTurma,
}: ScopeFilterSelectionModalProps) {
  const [items, setItems] = useState<ScopeFilterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));

  // Turma: filtros estado, município, escola e série (séries do nível)
  const [stateFilterTurma, setStateFilterTurma] = useState<string>(initialStateForTurma ?? '');
  const [municipalityFilterTurma, setMunicipalityFilterTurma] = useState<string>(initialMunicipalityIdForTurma ?? '');
  const [statesForTurma, setStatesForTurma] = useState<{ id: string; name: string; uf?: string }[]>([]);
  const [municipalitiesForTurma, setMunicipalitiesForTurma] = useState<{ id: string; name: string }[]>([]);
  const [schoolFilterId, setSchoolFilterId] = useState<string>('');
  const [schoolsForFilter, setSchoolsForFilter] = useState<{ id: string; name: string }[]>([]);
  const [gradeFilterId, setGradeFilterId] = useState<string>('');
  const [gradesForLevel, setGradesForLevel] = useState<{ id: string; name: string }[]>([]);
  const [turmaInitialApplied, setTurmaInitialApplied] = useState(false);

  // Escola: filtros estado e município
  const [stateFilterEscola, setStateFilterEscola] = useState<string>('');
  const [municipalityFilterEscola, setMunicipalityFilterEscola] = useState<string>('');
  const [statesForEscola, setStatesForEscola] = useState<{ id: string; name: string; uf?: string }[]>([]);
  const [municipalitiesForEscola, setMunicipalitiesForEscola] = useState<{ id: string; name: string }[]>([]);

  // Município: filtro estado
  const [stateFilterForMunicipio, setStateFilterForMunicipio] = useState<string>(stateNameForMunicipio ?? '');
  const [statesForMunicipio, setStatesForMunicipio] = useState<{ id: string; name: string; uf?: string }[]>([]);

  useEffect(() => {
    if (open) setSelected(new Set(selectedIds));
  }, [open, selectedIds]);

  // Turma: ao abrir, aplicar estado/município inicial conforme role
  useEffect(() => {
    if (!open || kind !== 'turma') {
      if (!open) setTurmaInitialApplied(false);
      return;
    }
    if (turmaInitialApplied) return;
    if (initialStateForTurma) setStateFilterTurma(initialStateForTurma);
    if (initialMunicipalityIdForTurma) setMunicipalityFilterTurma(initialMunicipalityIdForTurma);
    setTurmaInitialApplied(true);
  }, [open, kind, initialStateForTurma, initialMunicipalityIdForTurma, turmaInitialApplied]);

  // Turma: carregar estados
  useEffect(() => {
    if (!open || kind !== 'turma') return;
    api.get<Array<{ id: string; name: string; uf?: string }>>('/city/states').then((res) => {
      const raw = Array.isArray(res.data) ? res.data : [];
      setStatesForTurma(raw);
    }).catch(() => setStatesForTurma([]));
  }, [open, kind]);

  // Turma: carregar municípios quando estado selecionado
  useEffect(() => {
    if (!open || kind !== 'turma') return;
    if (!stateFilterTurma) {
      setMunicipalitiesForTurma([]);
      setMunicipalityFilterTurma('');
      return;
    }
    api.get<Array<{ id: string; name: string }>>(`/city/municipalities/state/${encodeURIComponent(stateFilterTurma)}`).then((res) => {
      const raw = Array.isArray(res.data) ? res.data : [];
      setMunicipalitiesForTurma(raw.map((m) => ({ id: m.id, name: m.name ?? m.id })));
    }).catch(() => setMunicipalitiesForTurma([]));
  }, [open, kind, stateFilterTurma]);

  // Turma: carregar escolas quando município selecionado (senão lista vazia)
  useEffect(() => {
    if (!open || kind !== 'turma') return;
    if (!municipalityFilterTurma) {
      setSchoolsForFilter([]);
      setSchoolFilterId('');
      return;
    }
    api.get<Array<{ id: string; name: string }>>(`/school/city/${municipalityFilterTurma}`).then((res) => {
      const raw = Array.isArray(res.data) ? res.data : [];
      setSchoolsForFilter(raw.map((s) => ({ id: s.id, name: s.name ?? s.id })));
    }).catch(() => setSchoolsForFilter([]));
    setSchoolFilterId('');
  }, [open, kind, municipalityFilterTurma]);

  // Turma: carregar séries do nível
  useEffect(() => {
    if (!open || kind !== 'turma') return;
    api.get<Array<{ id: string; name: string; education_stage?: { name?: string } }>>('/evaluation-results/grades').then((res) => {
      const raw = Array.isArray(res.data) ? res.data : [];
      const ofLevel = raw.filter((g) => gradeBelongsToLevel(g.education_stage?.name, competitionLevel));
      setGradesForLevel(ofLevel.map((g) => ({ id: g.id, name: g.name ?? g.id })));
    }).catch(() => setGradesForLevel([]));
  }, [open, kind, competitionLevel]);

  // Escola: carregar estados
  useEffect(() => {
    if (!open || kind !== 'escola') return;
    api.get<Array<{ id: string; name: string; uf?: string }>>('/city/states').then((res) => {
      const raw = Array.isArray(res.data) ? res.data : [];
      setStatesForEscola(raw);
    }).catch(() => setStatesForEscola([]));
  }, [open, kind]);

  // Escola: carregar municípios quando estado selecionado
  useEffect(() => {
    if (!open || kind !== 'escola' || !stateFilterEscola) {
      setMunicipalitiesForEscola([]);
      setMunicipalityFilterEscola('');
      return;
    }
    api.get<Array<{ id: string; name: string }>>(`/city/municipalities/state/${encodeURIComponent(stateFilterEscola)}`).then((res) => {
      const raw = Array.isArray(res.data) ? res.data : [];
      setMunicipalitiesForEscola(raw.map((m) => ({ id: m.id, name: m.name ?? m.id })));
    }).catch(() => setMunicipalitiesForEscola([]));
    setMunicipalityFilterEscola('');
  }, [open, kind, stateFilterEscola]);

  // Município: carregar estados
  useEffect(() => {
    if (!open || kind !== 'municipio') return;
    api.get<Array<{ id: string; name: string; uf?: string }>>('/city/states').then((res) => {
      const raw = Array.isArray(res.data) ? res.data : [];
      setStatesForMunicipio(raw);
      if (stateNameForMunicipio && !stateFilterForMunicipio) setStateFilterForMunicipio(stateNameForMunicipio);
    }).catch(() => setStatesForMunicipio([]));
  }, [open, kind, stateNameForMunicipio]);

  // Carregar itens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const stateName =
      kind === 'municipio' ? (stateFilterForMunicipio || stateNameForMunicipio)
      : kind === 'escola' ? stateFilterEscola || undefined
      : undefined;
    const municipalityId =
      kind === 'escola' ? municipalityFilterEscola || undefined
      : kind === 'turma' ? municipalityFilterTurma || undefined
      : undefined;
    const schoolId = kind === 'turma' ? schoolFilterId || undefined : undefined;
    const gradeId = kind === 'turma' ? gradeFilterId || undefined : undefined;
    fetchScopeItems(kind, {
      stateName,
      municipalityId,
      competitionLevel: kind === 'turma' ? competitionLevel : undefined,
      schoolId,
      gradeId,
    })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, kind, stateFilterForMunicipio, stateNameForMunicipio, stateFilterEscola, municipalityFilterEscola, municipalityFilterTurma, competitionLevel, schoolFilterId, gradeFilterId]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.subtitle?.toLowerCase().includes(q) ?? false) ||
        (i.meta?.toLowerCase().includes(q) ?? false)
    );
  }, [items, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filteredItems.map((i) => i.id)));
  const clearAll = () => setSelected(new Set());
  const handleConfirm = () => {
    onConfirm(Array.from(selected));
    onClose();
  };

  const label = KIND_LABELS[kind];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar {label}</DialogTitle>
          <DialogDescription>
            Escolha um ou mais itens. Use a busca e os filtros para encontrar com facilidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 flex-1 min-h-0 flex flex-col">
          {/* Filtros */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Buscar ${label.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {kind === 'turma' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Estado</Label>
                  <Select value={stateFilterTurma || '__none__'} onValueChange={(v) => { setStateFilterTurma(v === '__none__' ? '' : v); setMunicipalityFilterTurma(''); setSchoolFilterId(''); }}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecione</SelectItem>
                      {statesForTurma.map((s) => (
                        <SelectItem key={s.id} value={s.name}>{s.name}{s.uf ? ` (${s.uf})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Município</Label>
                  <Select value={municipalityFilterTurma || '__none__'} onValueChange={(v) => { setMunicipalityFilterTurma(v === '__none__' ? '' : v); setSchoolFilterId(''); }} disabled={!stateFilterTurma}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Município" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{stateFilterTurma ? 'Selecione' : 'Estado antes'}</SelectItem>
                      {municipalitiesForTurma.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Escola</Label>
                  <Select value={schoolFilterId || '__all__'} onValueChange={(v) => { setSchoolFilterId(v === '__all__' ? '' : v); setGradeFilterId(''); }} disabled={!municipalityFilterTurma}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder={municipalityFilterTurma ? 'Todas' : 'Município antes'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{municipalityFilterTurma ? 'Todas as escolas' : 'Selecione município'}</SelectItem>
                      {schoolsForFilter.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Série (nível da competição)</Label>
                  <Select value={gradeFilterId || '__all__'} onValueChange={(v) => setGradeFilterId(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas as séries</SelectItem>
                      {gradesForLevel.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {kind === 'escola' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Estado</Label>
                  <Select value={stateFilterEscola || '__none__'} onValueChange={(v) => { setStateFilterEscola(v === '__none__' ? '' : v); setMunicipalityFilterEscola(''); }}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Todos</SelectItem>
                      {statesForEscola.map((s) => (
                        <SelectItem key={s.id} value={s.name}>{s.name}{s.uf ? ` (${s.uf})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Município</Label>
                  <Select
                    value={municipalityFilterEscola || '__none__'}
                    onValueChange={(v) => setMunicipalityFilterEscola(v === '__none__' ? '' : v)}
                    disabled={!stateFilterEscola}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Município" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{stateFilterEscola ? 'Todos' : 'Selecione o estado'}</SelectItem>
                      {municipalitiesForEscola.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {kind === 'municipio' && (
              <div className="space-y-1">
                <Label className="text-xs">Estado</Label>
                <Select value={stateFilterForMunicipio || '__none__'} onValueChange={(v) => setStateFilterForMunicipio(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione o estado</SelectItem>
                    {statesForMunicipio.map((s) => (
                      <SelectItem key={s.id} value={s.name}>{s.name}{s.uf ? ` (${s.uf})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{selected.size} {selected.size === 1 ? 'item selecionado' : 'itens selecionados'}</span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={selectAll}>Selecionar todos (lista)</Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearAll}>Limpar</Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto rounded-md border bg-muted/20 p-2 min-h-[240px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
                <p>Nenhum item encontrado.</p>
                {kind === 'turma' && !municipalityFilterTurma && (
                  <p className="mt-1">Selecione estado e município para listar as turmas.</p>
                )}
                {kind === 'municipio' && !stateFilterForMunicipio && (
                  <p className="mt-1">Selecione um estado para listar os municípios.</p>
                )}
                {kind === 'escola' && stateFilterEscola && !municipalityFilterEscola && (
                  <p className="mt-1">Opcional: selecione um município para filtrar as escolas.</p>
                )}
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredItems.map((item) => (
                  <Card
                    key={item.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${selected.has(item.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                    onClick={() => toggle(item.id)}
                  >
                    <CardContent className="p-3 flex items-start gap-3">
                      <Checkbox
                        checked={selected.has(item.id)}
                        onCheckedChange={() => toggle(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Selecionar ${item.name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm leading-tight">{item.name}</p>
                        {item.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>}
                        {item.meta && <p className="text-xs text-muted-foreground mt-0.5">Estado: {item.meta}</p>}
                      </div>
                      {selected.has(item.id) && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm}>Confirmar ({selected.size})</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
