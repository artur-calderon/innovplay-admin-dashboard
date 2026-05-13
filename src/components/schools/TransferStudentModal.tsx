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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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

function formatDestinationRow(row: FilteredClassRow): string {
  const escola = row.school?.name ?? "—";
  const serie = gradeLabel(row.grade);
  const turma = row.name ?? "—";
  return `${escola} — ${serie} — ${turma}`;
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
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedId("");
      setRows([]);
      return;
    }
    if (!municipalityId) return;

    let cancelled = false;
    setQuery("");
    setSelectedId("");
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

  const destinations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => r.id && r.id !== sourceClassId)
      .filter((r) => {
        if (!q) return true;
        return formatDestinationRow(r).toLowerCase().includes(q);
      })
      .sort((a, b) =>
        formatDestinationRow(a).localeCompare(formatDestinationRow(b), "pt-BR", {
          sensitivity: "base",
        })
      );
  }, [rows, sourceClassId, query]);

  const handleTransfer = async () => {
    if (!student?.id || !selectedId) return;
    setSubmitting(true);
    try {
      const res = await api.post(
        `/students/${student.id}/transferir-turma`,
        { class_id: selectedId },
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

        <div className="space-y-3 flex-1 min-h-0 flex flex-col py-2">
          <div className="space-y-1.5">
            <label htmlFor="transfer-class-search" className="text-sm font-medium">
              Turma de destino
            </label>
            <Input
              id="transfer-class-search"
              placeholder="Buscar por escola, série ou turma…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loadingList}
            />
          </div>

          {loadingList ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando turmas…
            </div>
          ) : (
            <ScrollArea className="h-[min(50vh,320px)] border rounded-md">
              <div className="p-2 space-y-1">
                {destinations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 px-2">
                    Nenhuma turma encontrada. Ajuste a busca ou verifique permissões.
                  </p>
                ) : (
                  destinations.map((row) => {
                    const label = formatDestinationRow(row);
                    const active = selectedId === row.id;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        className={cn(
                          "w-full text-left rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
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
            disabled={!selectedId || submitting || !student}
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
