import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

interface SkillRow {
  id: string;
  code: string;
  description: string;
  subjectId: string;
  gradeId: string;
}

export interface AddSkillsBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (count?: number) => void;
  subjects: Array<{ id: string; name: string }>;
  grades: Array<{ id: string; name: string }>;
  defaultSubjectId?: string;
  defaultGradeId?: string;
}

const AddSkillsBatchModal = ({
  open,
  onOpenChange,
  onSuccess,
  subjects,
  grades,
  defaultSubjectId,
  defaultGradeId,
}: AddSkillsBatchModalProps) => {
  const [rows, setRows] = useState<SkillRow[]>(() => [
    { id: crypto.randomUUID(), code: "", description: "", subjectId: defaultSubjectId || "", gradeId: defaultGradeId || "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchErrors, setBatchErrors] = useState<Array<{ index: number; error: string }>>([]);

  const resetForm = () => {
    setRows([
      { id: crypto.randomUUID(), code: "", description: "", subjectId: defaultSubjectId || "", gradeId: defaultGradeId || "" },
    ]);
    setError(null);
    setBatchErrors([]);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), code: "", description: "", subjectId: defaultSubjectId || "", gradeId: defaultGradeId || "" },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const updateRow = (id: string, field: keyof SkillRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBatchErrors([]);

    const skills = rows
      .map((r) => ({
        code: r.code.trim(),
        description: r.description.trim(),
        subject_id: r.subjectId || undefined,
        grade_id: r.gradeId || undefined,
      }))
      .filter((s) => s.code || s.description);

    const validSkills = skills.filter((s) => s.code && s.description);
    if (validSkills.length === 0) {
      setError("Adicione pelo menos uma habilidade com código e descrição.");
      return;
    }

    setLoading(true);
    try {
      const payload = validSkills.map(({ code, description, subject_id, grade_id }) => {
        const item: Record<string, string> = { code, description };
        if (subject_id) item.subject_id = subject_id;
        if (grade_id) item.grade_id = grade_id;
        return item;
      });

      const { data } = await api.post<{
        created?: unknown[];
        count?: number;
        errors?: Array<{ index: number; error: string }>;
      }>("/skills/batch", { skills: payload });

      const created = data?.count ?? 0;
      const errs = data?.errors ?? [];
      setBatchErrors(errs);

      if (created > 0) {
        onSuccess(created);
        if (errs.length === 0) {
          resetForm();
          handleClose(false);
        } else {
          setError(`${created} habilidade(s) criada(s). ${errs.length} item(ns) com erro.`);
        }
      } else {
        setError("Nenhum item válido para criar.");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string }; status?: number } };
      const msg =
        axiosErr.response?.data?.error ||
        axiosErr.response?.data?.message ||
        (axiosErr.response?.status === 400
          ? "Nenhum item válido para criar."
          : "Erro ao adicionar habilidades em lote.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle>Adicionar habilidades em lote</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Código * / Descrição * / Disciplina / Série</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar linha
                </Button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {rows.map((row, idx) => (
                  <div key={row.id} className="flex gap-2 items-start">
                    <Input
                      placeholder="Código"
                      value={row.code}
                      onChange={(e) => updateRow(row.id, "code", e.target.value)}
                      className="flex-1 min-w-[100px]"
                    />
                    <Input
                      placeholder="Descrição"
                      value={row.description}
                      onChange={(e) => updateRow(row.id, "description", e.target.value)}
                      className="flex-[2] min-w-[150px]"
                    />
                    <Select
                      value={row.subjectId || "none"}
                      onValueChange={(v) => updateRow(row.id, "subjectId", v === "none" ? "" : v)}
                    >
                      <SelectTrigger className="w-[140px] shrink-0">
                        <SelectValue placeholder="Disciplina" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={row.gradeId || "none"}
                      onValueChange={(v) => updateRow(row.id, "gradeId", v === "none" ? "" : v)}
                    >
                      <SelectTrigger className="w-[120px] shrink-0">
                        <SelectValue placeholder="Série" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {grades.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {batchErrors.length > 0 && (
              <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive mb-1">Erros por linha:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {batchErrors.map((e, i) => (
                    <li key={i}>
                      Linha {e.index + 1}: {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && !batchErrors.length && (
              <p className="mt-3 text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter className="p-4 border-t shrink-0">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Adicionar em lote"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSkillsBatchModal;
