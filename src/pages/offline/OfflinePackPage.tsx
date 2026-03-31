import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Copy,
  GraduationCap,
  Hash,
  Info,
  Loader2,
  School,
  Smartphone,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/authContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { getUserHierarchyContext, cityIdQueryParamForAdmin } from '@/utils/userHierarchy';
import { EvaluationResultsApiService } from '@/services/evaluation/evaluationResultsApi';
import {
  registerOfflinePack,
  type RegisterOfflinePackResponse,
} from '@/services/mobile/offlinePackApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface StateOption {
  id: string;
  name: string;
}

interface CityRow {
  id: string;
  name: string;
}

interface SchoolRow {
  id: string;
  name: string;
}

interface ClassRow {
  id: string;
  name: string;
  school?: { id: string; name: string };
  grade?: { id: string; name: string };
}

interface TestRow {
  id: string;
  titulo: string;
}

interface StudentRow {
  id: string;
  name: string;
}

/** Valor sentinela para Select sempre controlado (evita alternar controlled/uncontrolled). */
const OFFLINE_SELECT_NONE = '__offline_none__';

function normalizeToClassRows(data: unknown): ClassRow[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as ClassRow[];
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const inner = o.data ?? o.classes ?? o.items ?? o.results ?? o.records;
    if (Array.isArray(inner)) return inner as ClassRow[];
  }
  return [];
}

function toggleInSet(ids: Set<string>, id: string, checked: boolean): Set<string> {
  const next = new Set(ids);
  if (checked) next.add(id);
  else next.delete(id);
  return next;
}

function formatExpiresAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function OfflinePackPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [grades, setGrades] = useState<Array<{ id: string; name: string }>>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [selectedStateId, setSelectedStateId] = useState(OFFLINE_SELECT_NONE);
  const [selectedCityId, setSelectedCityId] = useState(OFFLINE_SELECT_NONE);
  const [scopeMode, setScopeMode] = useState<'municipality' | 'custom'>('municipality');
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(new Set());
  const [selectedGradeIds, setSelectedGradeIds] = useState<Set<string>>(new Set());
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const [ttlHours, setTtlHours] = useState(48);
  const [maxRedemptions, setMaxRedemptions] = useState(30);

  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [result, setResult] = useState<RegisterOfflinePackResponse | null>(null);

  const effectiveCityIdForQuery =
    selectedCityId === OFFLINE_SELECT_NONE ? undefined : selectedCityId;

  const adminCityIdQuery = useMemo(
    () => cityIdQueryParamForAdmin(user?.role, effectiveCityIdForQuery),
    [user?.role, effectiveCityIdForQuery]
  );

  const requestCityId = effectiveCityIdForQuery || user?.tenant_id || undefined;

  const isAdmin = (user?.role ?? '').toLowerCase() === 'admin';

  /** Admin precisa ter município explícito; demais perfis usam seleção ou tenant do JWT. */
  const hasCityContext = isAdmin
    ? Boolean(effectiveCityIdForQuery)
    : Boolean(requestCityId);

  const visibleClasses = useMemo(() => {
    if (selectedGradeIds.size === 0) return classes;
    return classes.filter((c) => c.grade?.id && selectedGradeIds.has(c.grade.id));
  }, [classes, selectedGradeIds]);

  const singleClassIdForStudents = useMemo(() => {
    if (selectedClassIds.size !== 1) return null;
    return [...selectedClassIds][0];
  }, [selectedClassIds]);

  useEffect(() => {
    const run = async () => {
      setLoadingStates(true);
      try {
        const res = await api.get<unknown[]>('/city/states');
        const raw = Array.isArray(res.data) ? res.data : [];
        setStates(
          raw
            .map((s: Record<string, unknown>) => ({
              id: String(s.id ?? s.sigla ?? ''),
              name: String(s.name ?? s.nome ?? s.id ?? ''),
            }))
            .filter((s) => s.id)
        );
      } catch {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os estados.',
          variant: 'destructive',
        });
      } finally {
        setLoadingStates(false);
      }
    };
    run();
  }, [toast]);

  useEffect(() => {
    EvaluationResultsApiService.getGrades().then((g) =>
      setGrades(Array.isArray(g) ? g.map((x) => ({ id: x.id, name: x.name })) : [])
    );
  }, []);

  useEffect(() => {
    if (selectedStateId === OFFLINE_SELECT_NONE) {
      setCities([]);
      setSelectedCityId(OFFLINE_SELECT_NONE);
      return;
    }
    setLoadingCities(true);
    setSelectedCityId(OFFLINE_SELECT_NONE);
    api
      .get<CityRow[] | { data?: CityRow[] }>(`/city/municipalities/state/${selectedStateId}`)
      .then((res) => {
        let data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        if (!Array.isArray(data)) data = [];
        if (user?.role !== 'admin' && user?.tenant_id) {
          data = data.filter((c) => c.id === user.tenant_id);
        }
        setCities(data);
        if (data.length === 1) setSelectedCityId(data[0].id);
      })
      .catch(() => setCities([]))
      .finally(() => setLoadingCities(false));
  }, [selectedStateId, user?.role, user?.tenant_id]);

  useEffect(() => {
    if (!user?.id || user.role === 'admin') return;
    getUserHierarchyContext(user.id, user.role).then((ctx) => {
      if (ctx.municipality?.state && states.length > 0) {
        const stateMatch = states.find(
          (s) => s.id === ctx.municipality?.state || s.name === ctx.municipality?.state
        );
        if (stateMatch) setSelectedStateId(stateMatch.id);
      }
      if (ctx.municipality?.id) {
        setSelectedCityId(ctx.municipality.id);
      }
    });
  }, [user?.id, user?.role, states]);

  useEffect(() => {
    if (selectedCityId === OFFLINE_SELECT_NONE) {
      setSchools([]);
      setSelectedSchoolIds(new Set());
      return;
    }
    setLoadingSchools(true);
    const req = { meta: { cityId: selectedCityId } };
    api
      .get<SchoolRow[] | { schools: SchoolRow[]; data?: SchoolRow[] }>(
        `/school/city/${selectedCityId}`,
        req
      )
      .then((res) => {
        const raw = res.data;
        let list: SchoolRow[] = [];
        if (Array.isArray(raw)) list = raw;
        else if (raw && typeof raw === 'object') {
          list = raw.schools ?? raw.data ?? [];
        }
        setSchools(Array.isArray(list) ? list : []);
      })
      .catch(() => setSchools([]))
      .finally(() => setLoadingSchools(false));
  }, [selectedCityId]);

  const refreshClasses = useCallback(async () => {
    if (selectedCityId === OFFLINE_SELECT_NONE) {
      setClasses([]);
      setSelectedClassIds(new Set());
      return;
    }
    setLoadingClasses(true);
    try {
      const req = { meta: { cityId: selectedCityId } };
      const schoolList = [...selectedSchoolIds];
      let list: ClassRow[] = [];
      if (schoolList.length === 0) {
        const raw = await EvaluationResultsApiService.getFilteredClasses({
          municipality_id: selectedCityId,
        });
        list = normalizeToClassRows(raw);
      } else {
        const chunks = await Promise.all(
          schoolList.map((sid) =>
            api.get<unknown>(`/classes/school/${sid}`, req).then((r) => normalizeToClassRows(r.data))
          )
        );
        list = chunks.flat();
      }
      setClasses(list);
      setSelectedClassIds((prev) => {
        const allowed = new Set(list.map((c) => c.id));
        const next = new Set([...prev].filter((id) => allowed.has(id)));
        return next;
      });
    } catch {
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  }, [selectedCityId, selectedSchoolIds]);

  useEffect(() => {
    refreshClasses();
  }, [refreshClasses]);

  useEffect(() => {
    if (
      selectedStateId === OFFLINE_SELECT_NONE ||
      selectedCityId === OFFLINE_SELECT_NONE
    ) {
      setTests([]);
      setSelectedTestIds(new Set());
      return;
    }
    setLoadingTests(true);
    EvaluationResultsApiService.getFilterEvaluations({
      estado: selectedStateId,
      municipio: selectedCityId,
      ...(adminCityIdQuery ? { city_id: adminCityIdQuery } : {}),
    })
      .then((av) => {
        const rows = Array.isArray(av) ? av : [];
        setTests(rows.map((t) => ({ id: t.id, titulo: t.titulo })));
      })
      .catch(() => setTests([]))
      .finally(() => setLoadingTests(false));
  }, [selectedStateId, selectedCityId, adminCityIdQuery]);

  useEffect(() => {
    if (!singleClassIdForStudents || selectedCityId === OFFLINE_SELECT_NONE) {
      setStudents([]);
      setSelectedStudentIds(new Set());
      return;
    }
    let cancelled = false;
    setLoadingStudents(true);
    const req = { meta: { cityId: selectedCityId } };
    (async () => {
      try {
        let res;
        try {
          res = await api.get<Record<string, unknown>[]>(
            `/classes/${singleClassIdForStudents}/students`,
            req
          );
        } catch {
          res = await api.get(`/students/classes/${singleClassIdForStudents}`, req);
        }
        if (cancelled) return;
        const data = res.data as Record<string, unknown>[] | undefined;
        const rows = Array.isArray(data) ? data : [];
        setStudents(
          rows.map((s) => ({
            id: String(s.id ?? ''),
            name: String(s.nome ?? s.name ?? '—'),
          }))
        );
      } catch {
        if (!cancelled) setStudents([]);
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [singleClassIdForStudents, selectedCityId]);

  useEffect(() => {
    setResult(null);
  }, [scopeMode, selectedCityId]);

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Copiado', description: `${label} copiado para a área de transferência.` });
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: 'Copie manualmente o texto exibido.',
        variant: 'destructive',
      });
    }
  };

  const customScopeValid = useMemo(() => {
    return (
      selectedSchoolIds.size +
        selectedClassIds.size +
        selectedTestIds.size +
        selectedStudentIds.size >
      0
    );
  }, [selectedSchoolIds, selectedClassIds, selectedTestIds, selectedStudentIds]);

  const canSubmit =
    hasCityContext &&
    ttlHours >= 1 &&
    ttlHours <= 168 &&
    maxRedemptions >= 1 &&
    maxRedemptions <= 500 &&
    (scopeMode === 'municipality' || customScopeValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);
    try {
      const body =
        scopeMode === 'municipality'
          ? {
              scope: { type: 'municipality' as const },
              ttl_hours: ttlHours,
              max_redemptions: maxRedemptions,
            }
          : {
              scope: {
                type: 'custom' as const,
                school_ids: [...selectedSchoolIds],
                test_ids: [...selectedTestIds],
                class_ids: [...selectedClassIds],
                student_ids: [...selectedStudentIds],
              },
              ttl_hours: ttlHours,
              max_redemptions: maxRedemptions,
            };
      const cityIdForAdminHeader =
        isAdmin && effectiveCityIdForQuery ? effectiveCityIdForQuery : undefined;
      const data = await registerOfflinePack(body, cityIdForAdminHeader);
      setResult(data);
      toast({
        title: 'Código gerado',
        description: 'Compartilhe o código com segurança apenas com quem deve usar no aplicativo.',
      });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; error?: string } } };
      const msg =
        ax.response?.data?.message ||
        ax.response?.data?.error ||
        'Não foi possível gerar o código. Verifique suas permissões e tente novamente.';
      toast({ title: 'Falha ao gerar', description: String(msg), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 pb-16 md:p-6 lg:p-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Smartphone className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Modo offline</h1>
            <p className="text-muted-foreground text-sm">
              Gere um código para o aplicativo móvel baixar os dados do seu município ou de um escopo
              personalizado.
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-4 w-4" />
              Contexto (tenant)
            </CardTitle>
            <CardDescription>
              O código sempre respeita o município selecionado. Administradores precisam escolher
              estado e município; demais perfis usam o tenant vinculado à conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="offline-state">Estado</Label>
              <Select
                value={selectedStateId}
                onValueChange={setSelectedStateId}
                disabled={loadingStates}
              >
                <SelectTrigger id="offline-state">
                  <SelectValue placeholder={loadingStates ? 'Carregando…' : 'Selecione o estado'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OFFLINE_SELECT_NONE} disabled className="text-muted-foreground">
                    Selecione o estado
                  </SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offline-city">Município</Label>
              <Select
                value={selectedCityId}
                onValueChange={setSelectedCityId}
                disabled={selectedStateId === OFFLINE_SELECT_NONE || loadingCities}
              >
                <SelectTrigger id="offline-city">
                  <SelectValue placeholder={loadingCities ? 'Carregando…' : 'Selecione o município'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OFFLINE_SELECT_NONE} disabled className="text-muted-foreground">
                    Selecione o município
                  </SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Escopo dos dados</CardTitle>
            <CardDescription>
              Escolha entre sincronizar todo o município ou apenas escolas, turmas, provas e alunos
              específicos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={scopeMode}
              onValueChange={(v) => setScopeMode(v as 'municipality' | 'custom')}
              className="grid gap-3 sm:grid-cols-2"
            >
              <label
                className={cn(
                  'flex cursor-pointer flex-col rounded-xl border p-4 transition-colors',
                  scopeMode === 'municipality'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:bg-muted/40'
                )}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="municipality" id="scope-mun" className="mt-1" />
                  <div>
                    <span className="font-medium">Município inteiro</span>
                    <p className="text-muted-foreground mt-1 text-sm leading-snug">
                      Inclui todas as escolas e dados do município atual. Ideal para preparar vários
                      dispositivos de uma vez.
                    </p>
                  </div>
                </div>
              </label>
              <label
                className={cn(
                  'flex cursor-pointer flex-col rounded-xl border p-4 transition-colors',
                  scopeMode === 'custom'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:bg-muted/40'
                )}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="custom" id="scope-custom" className="mt-1" />
                  <div>
                    <span className="font-medium">Personalizado</span>
                    <p className="text-muted-foreground mt-1 text-sm leading-snug">
                      Limite a escolas, séries (via turmas), turmas, provas ou alunos. Marque ao menos
                      um critério abaixo.
                    </p>
                  </div>
                </div>
              </label>
            </RadioGroup>

            {scopeMode === 'custom' && (
              <div className="space-y-6 border-t pt-6">
                <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                  <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Combine os filtros como precisar: por exemplo, apenas uma escola e uma prova, ou
                    várias turmas. Turmas são filtradas por série quando você marca séries abaixo.
                  </p>
                </div>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 font-medium">
                    <School className="h-4 w-4" />
                    Escolas
                  </div>
                  <ScrollArea className="h-[160px] rounded-lg border">
                    <div className="space-y-0 p-3">
                      {loadingSchools ? (
                        <p className="text-muted-foreground text-sm">Carregando escolas…</p>
                      ) : schools.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Selecione um município.</p>
                      ) : (
                        schools.map((sch) => (
                          <label
                            key={sch.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md py-1.5 hover:bg-muted/60"
                          >
                            <Checkbox
                              checked={selectedSchoolIds.has(sch.id)}
                              onCheckedChange={(c) =>
                                setSelectedSchoolIds((prev) =>
                                  toggleInSet(prev, sch.id, c === true)
                                )
                              }
                            />
                            <span className="text-sm">{sch.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSchoolIds(new Set(schools.map((s) => s.id)))}
                      disabled={schools.length === 0}
                    >
                      Marcar todas
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSchoolIds(new Set())}
                    >
                      Limpar escolas
                    </Button>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 font-medium">
                    <GraduationCap className="h-4 w-4" />
                    Séries (filtra turmas)
                  </div>
                  <ScrollArea className="h-[120px] rounded-lg border">
                    <div className="space-y-0 p-3">
                      {grades.map((g) => (
                        <label
                          key={g.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md py-1.5 hover:bg-muted/60"
                        >
                          <Checkbox
                            checked={selectedGradeIds.has(g.id)}
                            onCheckedChange={(c) =>
                              setSelectedGradeIds((prev) => toggleInSet(prev, g.id, c === true))
                            }
                          />
                          <span className="text-sm">{g.name}</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-muted-foreground text-xs">
                    Sem série marcada, todas as turmas do município (ou das escolas marcadas) aparecem
                    na lista.
                  </p>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 font-medium">Turmas</div>
                  <ScrollArea className="h-[200px] rounded-lg border">
                    <div className="space-y-0 p-3">
                      {loadingClasses ? (
                        <p className="text-muted-foreground text-sm">Carregando turmas…</p>
                      ) : visibleClasses.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          Nenhuma turma encontrada para o filtro atual.
                        </p>
                      ) : (
                        visibleClasses.map((cl) => (
                          <label
                            key={cl.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md py-1.5 hover:bg-muted/60"
                          >
                            <Checkbox
                              checked={selectedClassIds.has(cl.id)}
                              onCheckedChange={(c) =>
                                setSelectedClassIds((prev) =>
                                  toggleInSet(prev, cl.id, c === true)
                                )
                              }
                            />
                            <span className="text-sm">
                              {cl.name}
                              {cl.school?.name ? (
                                <span className="text-muted-foreground"> · {cl.school.name}</span>
                              ) : null}
                              {cl.grade?.name ? (
                                <span className="text-muted-foreground"> · {cl.grade.name}</span>
                              ) : null}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedClassIds(new Set(visibleClasses.map((c) => c.id)))
                      }
                      disabled={visibleClasses.length === 0}
                    >
                      Marcar turmas visíveis
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedClassIds(new Set())}
                    >
                      Limpar turmas
                    </Button>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 font-medium">
                    <Hash className="h-4 w-4" />
                    Provas / avaliações
                  </div>
                  <ScrollArea className="h-[180px] rounded-lg border">
                    <div className="space-y-0 p-3">
                      {loadingTests ? (
                        <p className="text-muted-foreground text-sm">Carregando provas…</p>
                      ) : tests.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          Nenhuma prova listada para este município.
                        </p>
                      ) : (
                        tests.map((t) => (
                          <label
                            key={t.id}
                            className="flex cursor-pointer items-start gap-2 rounded-md py-1.5 hover:bg-muted/60"
                          >
                            <Checkbox
                              checked={selectedTestIds.has(t.id)}
                              onCheckedChange={(c) =>
                                setSelectedTestIds((prev) => toggleInSet(prev, t.id, c === true))
                            }
                            />
                            <span className="text-sm leading-snug">{t.titulo}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 font-medium">
                    <Users className="h-4 w-4" />
                    Alunos (opcional)
                  </div>
                  {!singleClassIdForStudents ? (
                    <p className="text-muted-foreground text-sm">
                      Selecione <strong>exatamente uma turma</strong> para listar e filtrar alunos.
                    </p>
                  ) : loadingStudents ? (
                    <p className="text-muted-foreground text-sm">Carregando alunos…</p>
                  ) : (
                    <ScrollArea className="h-[160px] rounded-lg border">
                      <div className="space-y-0 p-3">
                        {students.map((st) => (
                          <label
                            key={st.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md py-1.5 hover:bg-muted/60"
                          >
                            <Checkbox
                              checked={selectedStudentIds.has(st.id)}
                              onCheckedChange={(c) =>
                                setSelectedStudentIds((prev) =>
                                  toggleInSet(prev, st.id, c === true)
                                )
                              }
                            />
                            <span className="text-sm">{st.name}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </section>

                {!customScopeValid && (
                  <p className="text-destructive text-sm">
                    Marque ao menos uma escola, turma, prova ou aluno para o escopo personalizado.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-4 w-4" />
              Validade e uso do código
            </CardTitle>
            <CardDescription>
              Defina por quanto tempo o código permanece válido e quantas vezes pode ser utilizado
              no app.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ttl">Validade (horas)</Label>
              <Input
                id="ttl"
                type="number"
                min={1}
                max={168}
                value={ttlHours}
                onChange={(e) => setTtlHours(Number(e.target.value) || 0)}
              />
              <p className="text-muted-foreground text-xs">Entre 1 e 168 horas (7 dias).</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-red">Máximo de resgates</Label>
              <Input
                id="max-red"
                type="number"
                min={1}
                max={500}
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(Number(e.target.value) || 0)}
              />
              <p className="text-muted-foreground text-xs">Entre 1 e 500 utilizações.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" disabled={!canSubmit || submitting} size="lg" className="min-w-[200px]">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando…
              </>
            ) : (
              'Gerar código'
            )}
          </Button>
          {!hasCityContext && (
            <p className="text-muted-foreground text-sm">
              {isAdmin
                ? 'Como administrador, selecione estado e município para enviar o tenant (X-City-ID) na requisição.'
                : 'Selecione o município ou aguarde o carregamento do seu tenant para continuar.'}
            </p>
          )}
        </div>
      </form>

      {result && (
        <>
          <Separator />
          <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-emerald-900 dark:text-emerald-100">
                <CheckCircle2 className="h-5 w-5" />
                Código gerado com sucesso
              </CardTitle>
              <CardDescription>
                Peça para o usuário do app inserir este código na tela de modo offline. Trate o
                código como informação sensível.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="bg-background rounded-lg border px-4 py-3 text-lg font-semibold tracking-widest">
                    {result.code}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyText('Código', result.code)}
                    aria-label="Copiar código"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase">Expira em</p>
                  <p className="font-medium">{formatExpiresAt(result.expires_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase">Resgates máx.</p>
                  <p className="font-medium">{result.max_redemptions}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>ID do pacote</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-muted-foreground break-all rounded-md bg-muted/80 px-2 py-1 text-xs">
                    {result.offline_pack_id}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyText('ID do pacote', result.offline_pack_id)}
                  >
                    Copiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
