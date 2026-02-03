import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import {
  getCoinBalance,
  getCoinTransactionsByStudent,
  adminCredit,
  adminDebit,
  type CoinTransaction,
} from "@/services/coinsApi";
import { useToast } from "@/hooks/use-toast";
import { Coins, Search, Loader2, Check, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface City {
  id: string;
  name: string;
  state?: string;
}

interface School {
  id: string;
  name: string;
}

interface ClassItem {
  id: string;
  name: string;
  school_id?: string;
}

interface StudentWithMeta {
  id: string;
  name: string;
  registration?: string;
  class_id?: string;
  class_name?: string;
  school_name?: string;
  balance?: number;
}

const REASON_CREDIT = "admin_credit";
const REASON_DEBIT = "admin_debit";

export default function AdminCoins() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [cities, setCities] = useState<City[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentWithMeta[]>([]);

  const [selectedCityId, setSelectedCityId] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("__all__");
  const [nameFilter, setNameFilter] = useState("");

  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<StudentWithMeta | null>(null);
  const [selectedBalance, setSelectedBalance] = useState<number | null>(null);
  const [lastTransactions, setLastTransactions] = useState<CoinTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const [actionType, setActionType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [executing, setExecuting] = useState(false);

  const canAccess = user.role === "admin" || user.role === "coordenador";

  useEffect(() => {
    if (!canAccess) return;
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const res = await api.get("/city/");
        let data = res.data || [];
        if (user.role !== "admin") {
          data = data.filter((c: City) => c.id === user.tenant_id);
        }
        setCities(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        toast({ title: "Erro", description: "Não foi possível carregar municípios.", variant: "destructive" });
      } finally {
        setLoadingCities(false);
      }
    };
    fetchCities();
  }, [canAccess, user.role, user.tenant_id, toast]);

  useEffect(() => {
    if (!selectedCityId) {
      setSchools([]);
      setClasses([]);
      setSelectedSchoolId("");
      setSelectedClassId("");
      return;
    }
    setLoadingSchools(true);
    setSelectedSchoolId("");
setSelectedClassId("__all__");
      setClasses([]);
    api
      .get(`/school/city/${selectedCityId}`)
      .then((res) => {
        const raw = res.data?.schools ?? res.data ?? [];
        setSchools(Array.isArray(raw) ? raw : []);
      })
      .catch((e) => {
        console.error(e);
        setSchools([]);
        toast({ title: "Erro", description: "Não foi possível carregar escolas.", variant: "destructive" });
      })
      .finally(() => setLoadingSchools(false));
  }, [selectedCityId, toast]);

  useEffect(() => {
    if (!selectedSchoolId) {
      setClasses([]);
      setSelectedClassId("");
      return;
    }
    setLoadingClasses(true);
    setSelectedClassId("__all__");
    api
      .get(`/classes/school/${selectedSchoolId}`)
      .then((res) => {
        const raw = res.data || [];
        setClasses(Array.isArray(raw) ? raw : []);
      })
      .catch((e) => {
        console.error(e);
        setClasses([]);
      })
      .finally(() => setLoadingClasses(false));
  }, [selectedSchoolId]);

  const fetchStudents = useCallback(async () => {
    if (!selectedSchoolId) {
      toast({ title: "Atenção", description: "Selecione ao menos a escola.", variant: "destructive" });
      return;
    }
    setLoadingStudents(true);
    setStudents([]);
    setSelectedStudent(null);
    setSelectedBalance(null);
    setLastTransactions([]);
    try {
      const schoolName = schools.find((s) => s.id === selectedSchoolId)?.name ?? "";
      if (selectedClassId && selectedClassId !== "__all__") {
        const res = await api.get(`/students/classes/${selectedClassId}`);
        const list = res.data || [];
        const withMeta: StudentWithMeta[] = list.map((s: { id: string; name: string; registration?: string }) => ({
          id: s.id,
          name: s.name,
          registration: s.registration,
          class_id: selectedClassId,
          class_name: classes.find((c) => c.id === selectedClassId)?.name,
          school_name: schoolName,
        }));
        setStudents(withMeta);
      } else {
        const classIds = classes.map((c) => c.id);
        const byClass: StudentWithMeta[] = [];
        const seenIds = new Set<string>();
        for (const cls of classes) {
          try {
            const res = await api.get(`/students/classes/${cls.id}`);
            const list = res.data || [];
            for (const s of list) {
              if (seenIds.has(s.id)) continue;
              seenIds.add(s.id);
              byClass.push({
                id: s.id,
                name: s.name,
                registration: s.registration,
                class_id: cls.id,
                class_name: cls.name,
                school_name: schoolName,
              });
            }
          } catch {
            // ignore single class failure
          }
        }
        setStudents(byClass);
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Não foi possível carregar alunos.", variant: "destructive" });
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedSchoolId, selectedClassId, classes, schools, toast]);

  // Carrega saldos da lista de alunos (em lote, até 80)
  useEffect(() => {
    if (students.length === 0) return;
    const toFetch = students.slice(0, 80);
    let cancelled = false;
    Promise.all(toFetch.map((s) => getCoinBalance(s.id).then((r) => ({ id: s.id, balance: r.balance }))))
      .then((results) => {
        if (cancelled) return;
        setStudents((prev) =>
          prev.map((s) => {
            const r = results.find((x) => x.id === s.id);
            return r ? { ...s, balance: r.balance } : s;
          })
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [students.length]);

  useEffect(() => {
    if (selectedStudent) {
      setSelectedBalance(null);
      getCoinBalance(selectedStudent.id)
        .then((r) => setSelectedBalance(r.balance))
        .catch(() => setSelectedBalance(0));
      setLoadingTransactions(true);
      setLastTransactions([]);
      getCoinTransactionsByStudent(selectedStudent.id, 5)
        .then((r) => setLastTransactions(r.transactions || []))
        .catch(() => setLastTransactions([]))
        .finally(() => setLoadingTransactions(false));
    } else {
      setSelectedBalance(null);
      setLastTransactions([]);
    }
  }, [selectedStudent]);

  const filteredStudents = students.filter((s) =>
    nameFilter.trim()
      ? s.name.toLowerCase().includes(nameFilter.trim().toLowerCase())
      : true
  );

  const handleExecute = async () => {
    if (!selectedStudent) {
      toast({ title: "Atenção", description: "Selecione um aluno.", variant: "destructive" });
      return;
    }
    const num = parseInt(amount, 10);
    if (isNaN(num) || num <= 0) {
      toast({ title: "Atenção", description: "Informe uma quantidade válida (maior que zero).", variant: "destructive" });
      return;
    }
    if (actionType === "debit" && selectedBalance !== null && num > selectedBalance) {
      toast({ title: "Atenção", description: "Quantidade maior que o saldo atual.", variant: "destructive" });
      return;
    }
    setExecuting(true);
    try {
      const body = {
        student_id: selectedStudent.id,
        amount: num,
        reason: actionType === "credit" ? REASON_CREDIT : REASON_DEBIT,
        description: description.trim() || undefined,
      };
      const result = actionType === "credit" ? await adminCredit(body) : await adminDebit(body);
      setSelectedBalance(result.balance);
      setAmount("");
      setDescription("");
      toast({
        title: "Sucesso",
        description: actionType === "credit" ? `${num} moedas creditadas.` : `${num} moedas debitadas.`,
      });
      getCoinTransactionsByStudent(selectedStudent.id, 5)
        .then((r) => setLastTransactions(r.transactions || []))
        .catch(() => {});
      const idx = students.findIndex((s) => s.id === selectedStudent.id);
      if (idx >= 0) {
        const next = [...students];
        next[idx] = { ...next[idx], balance: result.balance };
        setStudents(next);
        setSelectedStudent(next[idx]);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        || (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || "Erro ao executar ação.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setExecuting(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Coins className="h-8 w-8 text-yellow-600" />
          Administração de moedas
        </h1>
        <p className="text-muted-foreground mt-1">
          Filtre até encontrar o aluno e depois credite ou debite moedas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Select value={selectedCityId} onValueChange={setSelectedCityId} disabled={loadingCities}>
                <SelectTrigger>
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
                disabled={loadingSchools || !selectedCityId}
              >
                <SelectTrigger>
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
                value={selectedClassId}
                onValueChange={setSelectedClassId}
                disabled={loadingClasses || !selectedSchoolId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do aluno</Label>
              <Input
                placeholder="Buscar por nome"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>
            <Button onClick={fetchStudents} disabled={loadingStudents || !selectedSchoolId}>
              {loadingStudents ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Buscar</span>
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
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center">
              {students.length === 0 ? "Clique em Buscar após selecionar a escola." : "Nenhum aluno encontrado com os filtros."}
            </p>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Escola</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedStudent(s)}
                      data-selected={selectedStudent?.id === s.id}
                    >
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.class_name ?? "—"}</TableCell>
                      <TableCell>{s.school_name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {s.balance !== undefined ? (
                          <span className="flex items-center justify-end gap-1">
                            <Coins className="h-4 w-4 text-yellow-600" />
                            {s.balance}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {selectedStudent?.id === s.id ? (
                          <Check className="h-5 w-5 text-primary" />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Aluno selecionado</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedStudent.name} (ID: {selectedStudent.id})
              </p>
            </CardHeader>
            <CardContent>
              <p className="flex items-center gap-2">
                <span className="text-muted-foreground">Saldo atual:</span>
                {selectedBalance === null ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="font-semibold flex items-center gap-1">
                    <Coins className="h-4 w-4 text-yellow-600" />
                    {selectedBalance}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={actionType} onValueChange={(v) => setActionType(v as "credit" | "debit")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit" id="credit" />
                  <Label htmlFor="credit" className="flex items-center gap-1 cursor-pointer">
                    <ArrowUpCircle className="h-4 w-4 text-green-600" />
                    Dar moedas
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="debit" id="debit" />
                  <Label htmlFor="debit" className="flex items-center gap-1 cursor-pointer">
                    <ArrowDownCircle className="h-4 w-4 text-red-600" />
                    Remover moedas
                  </Label>
                </div>
              </RadioGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Quantidade</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ex: 50"
                  />
                  {actionType === "debit" && selectedBalance !== null && amount && (
                    (() => {
                      const n = parseInt(amount, 10);
                      if (!isNaN(n) && n > selectedBalance) {
                        return (
                          <p className="text-sm text-destructive">Não pode exceder o saldo ({selectedBalance})</p>
                        );
                      }
                      return null;
                    })()
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo</Label>
                  <Select
                    value={actionType === "credit" ? REASON_CREDIT : REASON_DEBIT}
                    onValueChange={() => {}}
                  >
                    <SelectTrigger id="reason">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={REASON_CREDIT}>admin_credit</SelectItem>
                      <SelectItem value={REASON_DEBIT}>admin_debit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Recompensa por atividade"
                />
              </div>
              <Button onClick={handleExecute} disabled={executing}>
                {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span className="ml-2">Executar</span>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Últimas transações</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : lastTransactions.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma transação recente.</p>
              ) : (
                <ul className="space-y-2">
                  {lastTransactions.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 text-sm">
                      <span className={t.amount > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {t.amount > 0 ? "+" : ""}{t.amount}
                      </span>
                      <span className="text-muted-foreground">{t.reason}</span>
                      <span className="text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="text-muted-foreground">Saldo: {t.balance_after}</span>
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
