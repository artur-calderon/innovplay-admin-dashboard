import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export type TransferStudentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  municipalityId: string;
  sourceClassId: string;
  sourceClassName: string;
  student: { id: string; name: string } | null;
  onSuccess: () => void | Promise<void>;
};

type FilteredClassRow = {
  id: string;
  name?: string;
  school?: { id?: string; name?: string };
  grade?: { id?: string; name?: string } | string | null;
  city?: { id?: string; name?: string };
};

function gradeLabel(grade: FilteredClassRow["grade"]): string {
  if (grade == null) return "—";
  if (typeof grade === "string") return grade || "—";
  return String(grade.name ?? "—");
}

/** Chave estável para filtrar por série dentro da escola (com ou sem `grade.id`). */
function gradeFilterKey(row: FilteredClassRow): string {
  const g = row.grade;
  if (g == null) return "__none__";
  if (typeof g === "string") return `str:${g}`;
  if (g.id) return `id:${g.id}`;
  return `name:${g.name ?? ""}`;
}

function parseFilteredPayload(data: unknown): FilteredClassRow[] {
  if (Array.isArray(data)) return data as FilteredClassRow[];
  if (data && typeof data === "object" && "data" in data) {
    const inner = (data as { data: unknown }).data;
    if (Array.isArray(inner)) return inner as FilteredClassRow[];
  }
  return [];
}

export function TransferStudentModal({
  open,
  onOpenChange,
  municipalityId,
  sourceClassId,
  sourceClassName,
  student,
  onSuccess,
}: TransferStudentModalProps) {
  const { toast } = useToast();
  const [loadingList, setLoadingList] = useState(false);
  const [rows, setRows] = useState<FilteredClassRow[]>([]);
  const [filterSchoolId, setFilterSchoolId] = useState("");
  const [filterGradeKey, setFilterGradeKey] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setFilterSchoolId("");
      setFilterGradeKey("");
      setSelectedClassId("");
      setRows([]);
      return;
    }
    if (!municipalityId) return;

    let cancelled = false;
    setFilterSchoolId("");
    setFilterGradeKey("");
    setSelectedClassId("");
    setLoadingList(true);

    (async () => {
      try {
        const res = await api.get("/classes/filtered", {
          params: { municipality_id: municipalityId },
          meta: { cityId: municipalityId },
        });
        if (cancelled) return;
        setRows(parseFilteredPayload(res.data));
      } catch {
        if (cancelled) return;
        setRows([]);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as turmas do município.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, municipalityId, toast]);

  const baseRows = useMemo(
    () => rows.filter((r) => Boolean(r.id) && r.id !== sourceClassId),
    [rows, sourceClassId]
  );

  const schoolOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of baseRows) {
      const sid = r.school?.id?.trim();
      if (!sid) continue;
      const name = (r.school?.name ?? "").trim() || "Escola";
      if (!map.has(sid)) map.set(sid, name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [baseRows]);

  const gradeOptions = useMemo(() => {
    if (!filterSchoolId) return [];
    const map = new Map<string, string>();
    for (const r of baseRows) {
      if (r.school?.id !== filterSchoolId) continue;
      const key = gradeFilterKey(r);
      const label = gradeLabel(r.grade);
      if (!map.has(key)) map.set(key, label);
    }
    return [...map.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
  }, [baseRows, filterSchoolId]);

  const classOptions = useMemo(() => {
    if (!filterSchoolId || !filterGradeKey) return [];
    return baseRows
      .filter(
        (r) => r.school?.id === filterSchoolId && gradeFilterKey(r) === filterGradeKey
      )
      .sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "", "pt-BR", { sensitivity: "base" })
      );
  }, [baseRows, filterSchoolId, filterGradeKey]);

  const turmaPlaceholder = !filterSchoolId
    ? "Selecione a escola e a série primeiro"
    : !filterGradeKey
      ? "Selecione a série primeiro"
      : classOptions.length === 0
        ? "Nenhuma turma nesta série"
        : "Selecione a turma";

  useEffect(() => {
    if (!selectedClassId) return;
    const stillValid = classOptions.some((c) => c.id === selectedClassId);
    if (!stillValid) setSelectedClassId("");
  }, [classOptions, selectedClassId]);

  const handleTransfer = async () => {
    if (!student?.id || !selectedClassId) return;
    setSubmitting(true);
    try {
      const res = await api.post(
        `/students/${student.id}/transferir-turma`,
        { class_id: selectedClassId },
        { meta: { cityId: municipalityId } }
      );
      const msg =
        res.data && typeof res.data === "object" && "message" in res.data
          ? String((res.data as { message?: string }).message ?? "")
          : "";
      toast({
        title: "Sucesso",
        description: msg || "Aluno transferido para a nova turma.",
      });
      await Promise.resolve(onSuccess());
      onOpenChange(false);
    } catch (error: unknown) {
      let msg = "Não foi possível transferir o aluno.";
      if (error && typeof error === "object" && "response" in error) {
        const data = (error as { response?: { data?: { error?: string; details?: string } } })
          .response?.data;
        if (data?.details) msg = data.details;
        else if (data?.error) msg = data.error;
      }
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Transferir aluno de turma</DialogTitle>
          <DialogDescription>
            {student ? (
              <>
                <span className="font-medium text-foreground">{student.name}</span>
                {" — turma de origem: "}
                <span className="font-medium text-foreground">{sourceClassName}</span>
              </>
            ) : (
              "Selecione o destino no mesmo município."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col py-2">
          {loadingList ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando turmas…
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="transfer-filter-school">Escola</Label>
                <Select
                  value={filterSchoolId || undefined}
                  onValueChange={(v) => {
                    setFilterSchoolId(v);
                    setFilterGradeKey("");
                    setSelectedClassId("");
                  }}
                  disabled={schoolOptions.length === 0}
                >
                  <SelectTrigger id="transfer-filter-school">
                    <SelectValue placeholder="Selecione a escola" />
                  </SelectTrigger>
                  <SelectContent>
                    {schoolOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer-filter-grade">Série</Label>
                <Select
                  value={filterGradeKey || undefined}
                  onValueChange={(v) => {
                    setFilterGradeKey(v);
                    setSelectedClassId("");
                  }}
                  disabled={!filterSchoolId || gradeOptions.length === 0}
                >
                  <SelectTrigger id="transfer-filter-grade">
                    <SelectValue placeholder="Selecione a série" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map((g) => (
                      <SelectItem key={g.key} value={g.key}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filterSchoolId && gradeOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Não há turmas com série identificada para esta escola.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer-dest-class">Turma de destino</Label>
                <Select
                  value={selectedClassId || undefined}
                  onValueChange={setSelectedClassId}
                  disabled={
                    !filterSchoolId || !filterGradeKey || classOptions.length === 0
                  }
                >
                  <SelectTrigger id="transfer-dest-class">
                    <SelectValue placeholder={turmaPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name ?? "—"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filterSchoolId && filterGradeKey && classOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma turma nesta série para a escola escolhida.
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleTransfer()}
            disabled={!selectedClassId || submitting || !student}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transferindo…
              </>
            ) : (
              "Confirmar transferência"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
