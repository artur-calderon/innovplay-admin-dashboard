import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { Subject } from "./types";

interface SubjectModalProps {
  subjects: Subject[];
  onSubjectsChange: (subjects: Subject[]) => void;
  availableSubjects: Subject[];
  onClose: () => void;
}

export function SubjectModal({
  subjects,
  onSubjectsChange,
  availableSubjects,
  onClose,
}: SubjectModalProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSubjects = availableSubjects.filter(
    (subject) =>
      !subjects.some((s) => s.id === subject.id) &&
      subject.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSubject = (subject: Subject) => {
    onSubjectsChange([...subjects, subject]);
    setSearchTerm("");
  };

  const handleRemoveSubject = (subjectId: string) => {
    onSubjectsChange(subjects.filter((s) => s.id !== subjectId));
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Matérias
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Matérias</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="search">Buscar Matéria</Label>
            <Input
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite para buscar..."
            />
          </div>

          <div className="space-y-2">
            <Label>Matérias Disponíveis</Label>
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {filteredSubjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <span>{subject.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddSubject(subject)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Matérias Selecionadas</Label>
            <div className="space-y-2">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <span>{subject.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSubject(subject.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 