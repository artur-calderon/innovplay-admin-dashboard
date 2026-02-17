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
import { api } from "@/lib/api";

export interface AddSkillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  subjects: Array<{ id: string; name: string }>;
  grades: Array<{ id: string; name: string }>;
  defaultSubjectId?: string;
  defaultGradeId?: string;
}

const AddSkillModal = ({
  open,
  onOpenChange,
  onSuccess,
  subjects,
  grades,
  defaultSubjectId,
  defaultGradeId,
}: AddSkillModalProps) => {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState<string>(defaultSubjectId || "");
  const [gradeId, setGradeId] = useState<string>(defaultGradeId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setCode("");
    setDescription("");
    setSubjectId(defaultSubjectId || "");
    setGradeId(defaultGradeId || "");
    setError(null);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedCode = code.trim();
    const trimmedDesc = description.trim();
    if (!trimmedCode || !trimmedDesc) {
      setError("Código e descrição são obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, string> = {
        code: trimmedCode,
        description: trimmedDesc,
      };
      if (subjectId) payload.subject_id = subjectId;
      if (gradeId) payload.grade_id = gradeId;

      await api.post("/skills", payload);
      resetForm();
      onSuccess();
      handleClose(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string }; status?: number } };
      const msg =
        axiosErr.response?.data?.message ||
        (axiosErr.response?.status === 400
          ? "Dados inválidos. Verifique código, descrição, disciplina e série."
          : "Erro ao adicionar habilidade. Tente novamente.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar habilidade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="skill-code">Código *</Label>
            <Input
              id="skill-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: EF01LP01"
              required
            />
          </div>
          <div>
            <Label htmlFor="skill-description">Descrição *</Label>
            <Input
              id="skill-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Reconhecer elementos de uma narrativa"
              required
            />
          </div>
          <div>
            <Label>Disciplina (opcional)</Label>
            <Select value={subjectId || "none"} onValueChange={(v) => setSubjectId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Série (opcional)</Label>
            <Select value={gradeId || "none"} onValueChange={(v) => setGradeId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {grades.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSkillModal;
