import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/authContext';
import type { AvatarConfig } from '@/context/authContext';
import { api } from '@/lib/api';
import {
  getBalance,
  getTransactions,
  credit,
  debit,
  getApiErrorMessage,
  type CoinTransaction,
} from '@/services/coinsApi';
import { CoinBalance } from '@/components/coins/CoinBalance';
import { AvatarPreview } from '@/components/profile/AvatarPreview';
import { getUserHierarchyContext } from '@/utils/userHierarchy';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCoins } from '@/utils/coins';
import { Loader2, Coins, Plus, Minus, Search, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StateOption {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  state?: string;
}

interface School {
  id: string;
  name: string;
  city_id?: string;
}

interface ClassItem {
  id: string;
  name: string;
  school_id?: string;
  grade?: string | { id?: string; name?: string };
}

interface StudentRow {
  id: string;
  nome: string;
  name?: string;
  matricula?: string;
  class_name?: string;
  school_name?: string;
  serie_name?: string;
  user_id?: string;
  avatar_config?: AvatarConfig | null;
}

/** Normaliza nome do aluno a partir da resposta da API */
function getStudentDisplayName(s: Record<string, unknown>): string {
  return String(
    (s.nome ?? s.name ?? (s.usuario as Record<string, unknown>)?.name ?? '—')
  );
}

/** Normaliza nome da turma a partir da resposta da API */
function getStudentClassName(s: Record<string, unknown>): string | undefined {
  const raw = s.class_name ?? (s.class as Record<string, unknown>)?.name;
  return raw != null ? String(raw) : undefined;
}

/** Extrai user_id do aluno (para buscar avatar em GET /users/:id) */
function getStudentUserId(s: Record<string, unknown>): string | undefined {
  const u = (s.usuario ?? s.user) as Record<string, unknown> | undefined;
  const id = u?.id ?? s.user_id ?? s.usuario_id;
  return id != null ? String(id) : undefined;
}

/** Extrai avatar_config do aluno (usuario ou user na resposta da API) */
function getStudentAvatarConfig(s: Record<string, unknown>): AvatarConfig | null | undefined {
  const user = (s.usuario ?? s.user) as Record<string, unknown> | undefined;
  const config = user?.avatar_config ?? (s as Record<string, unknown>).avatar_config;
  if (config && typeof config === 'object') return config as AvatarConfig;
  return undefined;
}

/** Extrai nome da série do aluno (class.grade na resposta da API) ou da turma */
function getStudentSerieName(
  s: Record<string, unknown>,
  classItem?: ClassItem | null
): string | undefined {
  if (classItem?.grade != null) {
    return typeof classItem.grade === 'object' && classItem.grade !== null
      ? classItem.grade.name
      : String(classItem.grade);
  }
  const cls = s.class as Record<string, unknown> | undefined;
  if (!cls) return (s.serie as string) ?? (s.grade_name as string);
  const g = cls.grade;
  if (g == null) return (s.serie as string) ?? (s.grade_name as string);
  if (typeof g === 'object' && g !== null && 'name' in g) return String((g as { name?: string }).name);
  return String(g);
}

const CAN_EDIT_ROLES = ['admin', 'coordenador', 'diretor', 'tecadm'];
const ALL_CLASSES_VALUE = '__all__';

const CREDIT_REASONS = [
  { id: 'adjustment', apiReason: 'admin_credit' as const, label: 'Ajuste administrativo (crédito)' },
  { id: 'participation', apiReason: 'admin_credit' as const, label: 'Participação em atividade' },
  { id: 'bonus', apiReason: 'admin_credit' as const, label: 'Bonificação' },
  { id: 'correction', apiReason: 'admin_credit' as const, label: 'Correção de lançamento' },
  { id: 'other_credit', apiReason: 'admin_credit' as const, label: 'Outro' },
];
const DEBIT_REASONS = [
  { id: 'adjustment_debit', apiReason: 'admin_debit' as const, label: 'Ajuste administrativo (débito)' },
  { id: 'correction_debit', apiReason: 'admin_debit' as const, label: 'Correção de lançamento' },
  { id: 'other_debit', apiReason: 'admin_debit' as const, label: 'Outro' },
];

export default function CoinsAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [nameFilter, setNameFilter] = useState('');

  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [selectedBalance, setSelectedBalance] = useState<number | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<CoinTransaction[]>([]);

  const [creditAmount, setCreditAmount] = useState('');
  const [creditReasonId, setCreditReasonId] = useState(CREDIT_REASONS[0].id);
  const [creditDescription, setCreditDescription] = useState('');
  const [debitAmount, setDebitAmount] = useState('');
  const [debitReasonId, setDebitReasonId] = useState(DEBIT_REASONS[0].id);
  const [debitDescription, setDebitDescription] = useState('');
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);
  const [isSubmittingDebit, setIsSubmittingDebit] = useState(false);

  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [avatarConfigsByStudentId, setAvatarConfigsByStudentId] = useState<Record<string, AvatarConfig>>({});

  const selectedCreditReason = CREDIT_REASONS.find((r) => r.id === creditReasonId) ?? CREDIT_REASONS[0];
  const selectedDebitReason = DEBIT_REASONS.find((r) => r.id === debitReasonId) ?? DEBIT_REASONS[0];

  const canEdit = user?.role && CAN_EDIT_ROLES.includes(user.role);
  const pageTitle = canEdit ? 'Administração de moedas' : 'Consulta de saldos';

  if (user?.role === 'aluno') {
    return <Navigate to="/aluno/moedas/historico" replace />;
  }

  useEffect(() => {
    const loadStates = async () => {
      setLoadingStates(true);
      try {
        const res = await api.get<unknown[]>('/city/states');
        const raw = Array.isArray(res.data) ? res.data : [];
        const data: StateOption[] = raw.map((s: Record<string, unknown>) => ({
          id: String(s.id ?? s.sigla ?? ''),
          name: String(s.name ?? s.nome ?? s.id ?? s.sigla ?? ''),
        })).filter((s) => s.id);
        setStates(data);
      } catch (err) {
        toast({ title: 'Erro', description: 'Não foi possível carregar os estados.', variant: 'destructive' });
      } finally {
        setLoadingStates(false);
      }
    };
    loadStates();
  }, [toast]);

  useEffect(() => {
    if (!selectedStateId) {
      setCities([]);
      setSelectedCityId('');
      setSelectedSchoolId('');
      setSelectedClassId('');
      setStudents([]);
      return;
    }
    setSelectedCityId('');
    setSelectedSchoolId('');
    setSelectedClassId('');
    setStudents([]);
    setLoadingCities(true);
    api
      .get<City[]>(`/city/municipalities/state/${selectedStateId}`)
      .then((res) => {
        let data = Array.isArray(res.data) ? res.data : (res.data as { data?: City[] })?.data ?? [];
        if (user?.role !== 'admin' && user?.tenant_id) {
          data = data.filter((c: City) => c.id === user.tenant_id);
        }
        setCities(data);
        if (data.length === 1) setSelectedCityId(data[0].id);
        else setSelectedCityId('');
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
      if (ctx.municipality?.id && cities.some((c) => c.id === ctx.municipality?.id)) {
        setSelectedCityId(ctx.municipality.id);
      }
      if (ctx.school?.id) {
        setSelectedSchoolId(ctx.school.id);
      }
    });
  }, [user?.id, user?.role, states, cities]);

  useEffect(() => {
    if (!selectedCityId) {
      setSchools([]);
      setSelectedSchoolId('');
      return;
    }
    setLoadingSchools(true);
    const schoolConfig = selectedCityId ? { meta: { cityId: selectedCityId } } : {};
    api
      .get<School[] | { schools: School[] }>(`/school/city/${selectedCityId}`, schoolConfig)
      .then((res) => {
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (raw as { schools?: School[] })?.schools ?? [];
        setSchools(list);
        if (list.length === 1) setSelectedSchoolId(list[0].id);
        else setSelectedSchoolId('');
      })
      .catch(() => setSchools([]))
      .finally(() => setLoadingSchools(false));
  }, [selectedCityId]);

  useEffect(() => {
    if (!selectedSchoolId) {
      setClasses([]);
      setSelectedClassId('');
      return;
    }
    setLoadingClasses(true);
    const classesConfig = selectedCityId ? { meta: { cityId: selectedCityId } } : {};
    api
      .get<ClassItem[]>(`/classes/school/${selectedSchoolId}`, classesConfig)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setClasses(list);
        setSelectedClassId('');
      })
      .catch(() => setClasses([]))
      .finally(() => setLoadingClasses(false));
  }, [selectedSchoolId]);

  const loadStudents = useCallback(async () => {
    if (!selectedSchoolId) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    try {
      let rawList: Record<string, unknown>[] = [];
      const school = schools.find((s) => s.id === selectedSchoolId);
      const schoolName = school?.name ?? '';

      if (selectedClassId) {
        const studentConfig = selectedCityId ? { meta: { cityId: selectedCityId } } : {};
        const res = await api.get(`/classes/${selectedClassId}/students`, studentConfig).catch(() =>
          api.get(`/students/classes/${selectedClassId}`, studentConfig)
        );
        const data = res.data as Record<string, unknown>[] | { students?: Record<string, unknown>[] };
        rawList = Array.isArray(data) ? data : (data as { students?: Record<string, unknown>[] }).students ?? [];
        const classItem = classes.find((c) => c.id === selectedClassId);
        const classDisplayName = classItem?.name;
        setStudents(
          rawList.map((s) => ({
            id: String(s.id ?? ''),
            nome: getStudentDisplayName(s),
            class_name: getStudentClassName(s) ?? classDisplayName,
            school_name: schoolName,
            serie_name: getStudentSerieName(s, classItem ?? undefined),
            user_id: getStudentUserId(s),
            avatar_config: getStudentAvatarConfig(s),
          }))
        );
      } else {
        const schoolStudentsConfig = selectedCityId ? { meta: { cityId: selectedCityId } } : {};
        const res = await api.get(`/students/school/${selectedSchoolId}`, schoolStudentsConfig);
        const data = Array.isArray(res.data) ? res.data : [];
        setStudents(
          data.map((s: Record<string, unknown>) => ({
            id: String(s.id ?? ''),
            nome: getStudentDisplayName(s),
            class_name: getStudentClassName(s),
            school_name: schoolName,
            serie_name: getStudentSerieName(s),
            user_id: getStudentUserId(s),
            avatar_config: getStudentAvatarConfig(s),
          }))
        );
      }
    } catch (err) {
      setStudents([]);
      toast({ title: 'Erro', description: 'Não foi possível carregar os alunos.', variant: 'destructive' });
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedSchoolId, selectedClassId, selectedCityId, schools, classes, toast]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Buscar avatar do perfil (GET /users/:id) para alunos que ainda não têm avatar_config
  useEffect(() => {
    if (students.length === 0) return;
    const toFetch = students.filter((s) => s.user_id && !s.avatar_config);
    if (toFetch.length === 0) return;
    const BATCH_SIZE = 8;
    let cancelled = false;
    (async () => {
      for (let i = 0; i < toFetch.length && !cancelled; i += BATCH_SIZE) {
        const batch = toFetch.slice(i, i + BATCH_SIZE);
        const avatarConfig = selectedCityId ? { meta: { cityId: selectedCityId } } : {};
        const results = await Promise.all(
          batch.map(({ id: studentId, user_id: userId }) =>
            api
              .get<{ user?: { avatar_config?: AvatarConfig }; avatar_config?: AvatarConfig }>(`/users/${userId}`, avatarConfig)
              .then((res) => {
                const data = res.data?.user ?? res.data;
                const config = data?.avatar_config;
                return {
                  studentId,
                  config: config && typeof config === 'object' ? (config as AvatarConfig) : null,
                };
              })
              .catch(() => ({ studentId, config: null }))
          )
        );
        if (cancelled) return;
        const updates = results.reduce<Record<string, AvatarConfig>>((acc, r) => {
          if (r.config != null) acc[r.studentId] = r.config;
          return acc;
        }, {});
        if (Object.keys(updates).length > 0) {
          setAvatarConfigsByStudentId((prev) => ({ ...prev, ...updates }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [students]);

  const getStudentDisplayNameRow = (s: StudentRow) => s.nome ?? s.name ?? s.id ?? '—';

  /** Avatar do aluno: da lista, do cache (busca por user_id) ou undefined (mostra ícone) */
  const getStudentAvatar = (s: StudentRow): AvatarConfig | null | undefined => {
    if (s.avatar_config) return s.avatar_config;
    return avatarConfigsByStudentId[s.id] ?? undefined;
  };

  const filteredStudents = nameFilter.trim()
    ? students.filter((s) =>
        getStudentDisplayNameRow(s).toLowerCase().includes(nameFilter.trim().toLowerCase())
      )
    : students;

  useEffect(() => {
    if (!selectedStudent?.id) {
      setSelectedBalance(null);
      setRecentTransactions([]);
      return;
    }
    getBalance(selectedStudent.id).then(setSelectedBalance).catch(() => setSelectedBalance(null));
    getTransactions({ student_id: selectedStudent.id, limit: 5 })
      .then(setRecentTransactions)
      .catch(() => setRecentTransactions([]));
  }, [selectedStudent?.id]);

  const handleCredit = async () => {
    if (!selectedStudent?.id || !canEdit) return;
    const num = parseInt(creditAmount, 10);
    if (isNaN(num) || num <= 0) {
      toast({ title: 'Valor inválido', description: 'Informe uma quantidade maior que zero.', variant: 'destructive' });
      return;
    }
    const descriptionToSend = creditDescription.trim() || selectedCreditReason.label;
    setIsSubmittingCredit(true);
    try {
      await credit(selectedStudent.id, num, selectedCreditReason.apiReason, descriptionToSend, selectedCityId || undefined);
      toast({ title: 'Sucesso', description: `${formatCoins(num)} moedas creditadas.` });
      setCreditAmount('');
      setCreditDescription('');
      const newBalance = await getBalance(selectedStudent.id);
      setSelectedBalance(newBalance);
      const tx = await getTransactions({ student_id: selectedStudent.id, limit: 5 });
      setRecentTransactions(tx);
    } catch (err) {
      toast({ title: 'Erro', description: getApiErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  const handleDebit = async () => {
    if (!selectedStudent?.id || !canEdit) return;
    const num = parseInt(debitAmount, 10);
    if (isNaN(num) || num <= 0) {
      toast({ title: 'Valor inválido', description: 'Informe uma quantidade maior que zero.', variant: 'destructive' });
      return;
    }
    if (selectedBalance !== null && num > selectedBalance) {
      toast({ title: 'Saldo insuficiente', description: 'A quantidade não pode ser maior que o saldo atual.', variant: 'destructive' });
      return;
    }
    const descriptionToSend = debitDescription.trim() || selectedDebitReason.label;
    setIsSubmittingDebit(true);
    try {
      await debit(selectedStudent.id, num, selectedDebitReason.apiReason, descriptionToSend, selectedCityId || undefined);
      toast({ title: 'Sucesso', description: `${formatCoins(num)} moedas debitadas.` });
      setDebitAmount('');
      setDebitDescription('');
      const newBalance = await getBalance(selectedStudent.id);
      setSelectedBalance(newBalance);
      const tx = await getTransactions({ student_id: selectedStudent.id, limit: 5 });
      setRecentTransactions(tx);
    } catch (err) {
      toast({ title: 'Erro', description: getApiErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsSubmittingDebit(false);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
          <Coins className="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0" />
          {pageTitle}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          {canEdit
            ? 'Filtre os alunos, selecione um e credite ou debite moedas.'
            : 'Consulte saldos dos alunos conforme seu escopo de acesso.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={selectedStateId} onValueChange={setSelectedStateId} disabled={loadingStates}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione o estado" />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Select value={selectedCityId} onValueChange={setSelectedCityId} disabled={!selectedStateId || loadingCities}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione a cidade" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Escola</Label>
            <Select
              value={selectedSchoolId}
              onValueChange={setSelectedSchoolId}
              disabled={!selectedCityId || loadingSchools}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione a escola" />
              </SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Turma</Label>
            <Select
              value={selectedClassId || ALL_CLASSES_VALUE}
              onValueChange={(v) => setSelectedClassId(v === ALL_CLASSES_VALUE ? '' : v)}
              disabled={!selectedSchoolId || loadingClasses}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CLASSES_VALUE}>Todas</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nome do aluno</Label>
            <div className="relative w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button onClick={loadStudents} disabled={loadingStudents}>
              {loadingStudents ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Alunos — clique em um card para selecionar</h2>
        {loadingStudents ? (
          <div className="flex items-center gap-2 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Carregando alunos...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Coins className="h-14 w-14 text-muted-foreground/50 mb-4" />
              <p className="font-medium text-muted-foreground">Nenhum aluno encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajuste os filtros (estado, cidade, escola, turma) e clique em Atualizar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredStudents.map((s) => {
              const isSelected = selectedStudent?.id === s.id;
              const displayName = getStudentDisplayNameRow(s);
              const serieTurma = [s.serie_name, s.class_name].filter(Boolean).join(' · ') || '—';
              return (
                <Card
                  key={s.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    isSelected
                      ? 'ring-2 ring-primary bg-primary/5 shadow-md'
                      : 'hover:bg-muted/30'
                  )}
                  onClick={() => setSelectedStudent(s)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    {getStudentAvatar(s) ? (
                      <AvatarPreview config={getStudentAvatar(s)!} size={44} className="shrink-0" />
                    ) : (
                      <div
                        className="h-11 w-11 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center"
                        aria-hidden
                      >
                        <GraduationCap className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{serieTurma}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {selectedStudent && (
        <>
          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {getStudentAvatar(selectedStudent) ? (
                  <AvatarPreview config={getStudentAvatar(selectedStudent)!} size={48} className="shrink-0" />
                ) : (
                  <div
                    className="h-12 w-12 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center"
                    aria-hidden
                  >
                    <GraduationCap className="h-7 w-7" />
                  </div>
                )}
                <div>
                  <span className="block">{getStudentDisplayNameRow(selectedStudent)}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {[selectedStudent.serie_name, selectedStudent.class_name].filter(Boolean).join(' · ') || '—'}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-background/80 p-4">
                <Coins className="h-6 w-6 text-amber-500" />
                <span className="text-lg font-semibold">Saldo atual:</span>
                <CoinBalance studentId={selectedStudent.id} size="medium" showLabel={true} />
              </div>

              {canEdit && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                        <Plus className="h-5 w-5" />
                        Dar moedas
                      </CardTitle>
                      <p className="text-xs font-normal text-muted-foreground">
                        Adicione moedas ao saldo do aluno.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          min={1}
                          value={creditAmount}
                          onChange={(e) => setCreditAmount(e.target.value)}
                          placeholder="Ex.: 50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Motivo</Label>
                        <Select value={creditReasonId} onValueChange={setCreditReasonId}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CREDIT_REASONS.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição (opcional)</Label>
                        <Input
                          value={creditDescription}
                          onChange={(e) => setCreditDescription(e.target.value)}
                          placeholder="Ex.: Participação na gincana"
                        />
                      </div>
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={handleCredit}
                        disabled={isSubmittingCredit}
                      >
                        {isSubmittingCredit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        Creditar moedas
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <Minus className="h-5 w-5" />
                        Remover moedas
                      </CardTitle>
                      <p className="text-xs font-normal text-muted-foreground">
                        Subtraia moedas do saldo do aluno.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          min={1}
                          value={debitAmount}
                          onChange={(e) => setDebitAmount(e.target.value)}
                          placeholder="Ex.: 10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Motivo</Label>
                        <Select value={debitReasonId} onValueChange={setDebitReasonId}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DEBIT_REASONS.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição (opcional)</Label>
                        <Input
                          value={debitDescription}
                          onChange={(e) => setDebitDescription(e.target.value)}
                          placeholder="Ex.: Correção de lançamento"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleDebit}
                        disabled={isSubmittingDebit}
                      >
                        {isSubmittingDebit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Minus className="h-4 w-4 mr-2" />}
                        Debitar moedas
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Últimas transações</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentTransactions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhuma transação recente.</p>
                  ) : (
                    <ul className="space-y-2">
                      {recentTransactions.map((t) => (
                        <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                          <span className={t.amount > 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                            {t.amount > 0 ? '+' : ''}{formatCoins(t.amount)}
                          </span>
                          <span className="text-muted-foreground flex-1 min-w-0 truncate">{t.description || t.reason}</span>
                          <span className="text-muted-foreground shrink-0">{new Date(t.created_at).toLocaleDateString('pt-BR')}</span>
                          <span className="shrink-0">Saldo: {formatCoins(t.balance_after)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
