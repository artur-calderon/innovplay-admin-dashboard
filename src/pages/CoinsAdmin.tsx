import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/authContext';
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
import { getUserHierarchyContext } from '@/utils/userHierarchy';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCoins } from '@/utils/coins';
import { Loader2, Coins } from 'lucide-react';

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
}

interface StudentRow {
  id: string;
  nome: string;
  name?: string;
  matricula?: string;
  class_name?: string;
  school_name?: string;
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

  const [actionType, setActionType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [reasonOptionId, setReasonOptionId] = useState(CREDIT_REASONS[0].id);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const reasonOptions = actionType === 'credit' ? CREDIT_REASONS : DEBIT_REASONS;
  const selectedReasonOption = reasonOptions.find((r) => r.id === reasonOptionId) ?? reasonOptions[0];

  useEffect(() => {
    setReasonOptionId(actionType === 'credit' ? CREDIT_REASONS[0].id : DEBIT_REASONS[0].id);
  }, [actionType]);

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
        console.error('Erro ao carregar estados:', err);
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
    api
      .get<School[] | { schools: School[] }>(`/school/city/${selectedCityId}`)
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
    api
      .get<ClassItem[]>(`/classes/school/${selectedSchoolId}`)
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
        const res = await api.get(`/classes/${selectedClassId}/students`).catch(() =>
          api.get(`/students/classes/${selectedClassId}`)
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
          }))
        );
      } else {
        const res = await api.get(`/students/school/${selectedSchoolId}`);
        const data = Array.isArray(res.data) ? res.data : [];
        setStudents(
          data.map((s: Record<string, unknown>) => ({
            id: String(s.id ?? ''),
            nome: getStudentDisplayName(s),
            class_name: getStudentClassName(s),
            school_name: schoolName,
          }))
        );
      }
    } catch (err) {
      console.error('Erro ao carregar alunos:', err);
      setStudents([]);
      toast({ title: 'Erro', description: 'Não foi possível carregar os alunos.', variant: 'destructive' });
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedSchoolId, selectedClassId, schools, classes, toast]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const getStudentDisplayNameRow = (s: StudentRow) => s.nome ?? s.name ?? s.id ?? '—';

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

  const handleExecute = async () => {
    if (!selectedStudent?.id || !canEdit) return;
    const num = parseInt(amount, 10);
    if (isNaN(num) || num <= 0) {
      toast({ title: 'Valor inválido', description: 'Informe uma quantidade maior que zero.', variant: 'destructive' });
      return;
    }
    if (actionType === 'debit' && selectedBalance !== null && num > selectedBalance) {
      toast({ title: 'Saldo insuficiente', description: 'A quantidade não pode ser maior que o saldo atual.', variant: 'destructive' });
      return;
    }
    const apiReason = selectedReasonOption.apiReason;
    const descriptionToSend = description.trim() || selectedReasonOption.label;

    setIsSubmitting(true);
    try {
      if (actionType === 'credit') {
        await credit(selectedStudent.id, num, apiReason, descriptionToSend);
        toast({ title: 'Sucesso', description: `${formatCoins(num)} moedas creditadas.` });
      } else {
        await debit(selectedStudent.id, num, apiReason, descriptionToSend);
        toast({ title: 'Sucesso', description: `${formatCoins(num)} moedas debitadas.` });
      }
      setAmount('');
      setDescription('');
      const newBalance = await getBalance(selectedStudent.id);
      setSelectedBalance(newBalance);
      const tx = await getTransactions({ student_id: selectedStudent.id, limit: 5 });
      setRecentTransactions(tx);
    } catch (err) {
      toast({
        title: 'Erro',
        description: getApiErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Coins className="h-8 w-8 text-primary" />
          {pageTitle}
        </h1>
        <p className="text-muted-foreground">
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
            <Input
              className="w-[200px]"
              placeholder="Buscar por nome"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={loadStudents} disabled={loadingStudents}>
              {loadingStudents ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alunos (clique para selecionar)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStudents ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando alunos...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Coins className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="font-medium text-muted-foreground">Nenhum aluno encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajuste os filtros (estado, cidade, escola, turma) e clique em Buscar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Nome</TableHead>
                    <TableHead className="min-w-[120px] whitespace-nowrap">Turma</TableHead>
                    <TableHead className="min-w-[180px]">Escola</TableHead>
                    <TableHead className="text-right min-w-[100px]">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s) => (
                    <TableRow
                      key={s.id}
                      className={selectedStudent?.id === s.id ? 'bg-muted/50' : 'cursor-pointer hover:bg-muted/30'}
                      onClick={() => setSelectedStudent(s)}
                    >
                      <TableCell className="min-w-[200px] font-medium">{getStudentDisplayNameRow(s)}</TableCell>
                      <TableCell className="min-w-[120px] whitespace-nowrap">{s.class_name ?? '—'}</TableCell>
                      <TableCell className="min-w-[180px]">{s.school_name ?? '—'}</TableCell>
                      <TableCell className="text-right min-w-[100px]">
                        {selectedStudent?.id === s.id && selectedBalance !== null
                          ? formatCoins(selectedBalance)
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Aluno selecionado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-lg font-medium">{getStudentDisplayNameRow(selectedStudent)}</p>
              <p className="text-sm text-muted-foreground">ID para conferência: {selectedStudent.id}</p>
              <p><strong>Saldo atual:</strong> <CoinBalance studentId={selectedStudent.id} size="medium" showLabel={true} /></p>
            </CardContent>
          </Card>

          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Ação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={actionType} onValueChange={(v) => setActionType(v as 'credit' | 'debit')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="credit" id="credit" />
                    <Label htmlFor="credit">Dar moedas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="debit" id="debit" />
                    <Label htmlFor="debit">Remover moedas</Label>
                  </div>
                </RadioGroup>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Select value={reasonOptionId} onValueChange={setReasonOptionId}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {reasonOptions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição"
                  />
                </div>
                <Button onClick={handleExecute} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Executar
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Últimas transações</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma transação recente.</p>
              ) : (
                <ul className="space-y-2">
                  {recentTransactions.map((t) => (
                    <li key={t.id} className="flex justify-between text-sm">
                      <span className={t.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {t.amount > 0 ? '+' : ''}{formatCoins(t.amount)}
                      </span>
                      <span className="text-muted-foreground">{t.description || t.reason}</span>
                      <span>{new Date(t.created_at).toLocaleDateString('pt-BR')}</span>
                      <span>Saldo: {formatCoins(t.balance_after)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
