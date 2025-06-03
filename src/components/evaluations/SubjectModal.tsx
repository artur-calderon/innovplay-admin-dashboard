import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export interface Subject {
  id: string;
  name: string;
  questionCount: number;
}

interface SubjectModalProps {
  subjects: Subject[];
  onSubjectsChange: (subjects: Subject[]) => void;
  availableSubjects: { id: string; name: string }[];
}

export function SubjectModal({
  subjects,
  onSubjectsChange,
  availableSubjects,
}: SubjectModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [questionCount, setQuestionCount] = useState("");

  const handleAddSubject = () => {
    if (!selectedSubject || !questionCount) return;

    const subject = availableSubjects.find((s) => s.id === selectedSubject);
    if (!subject) return;

    const newSubject: Subject = {
      id: subject.id,
      name: subject.name,
      questionCount: parseInt(questionCount),
    };

    onSubjectsChange([...subjects, newSubject]);
    setSelectedSubject("");
    setQuestionCount("");
  };

  const handleRemoveSubject = (subjectId: string) => {
    onSubjectsChange(subjects.filter((s) => s.id !== subjectId));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Matéria
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Matéria</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="subject">Matéria</Label>
            <Select
              value={selectedSubject}
              onValueChange={setSelectedSubject}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma matéria" />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="questionCount">Quantidade de Questões</Label>
            <Input
              id="questionCount"
              type="number"
              min="1"
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
              placeholder="Digite a quantidade de questões"
            />
          </div>
          <Button onClick={handleAddSubject}>Adicionar</Button>

          {subjects.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Matérias Adicionadas</h3>
              <div className="space-y-2">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div>
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {subject.questionCount} questões
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSubject(subject.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 