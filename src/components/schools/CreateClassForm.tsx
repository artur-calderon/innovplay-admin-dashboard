import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";

interface EducationStage {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
  education_stage_id: string;
}

interface CreateClassFormProps {
  schoolId: string;
  onSuccess?: () => void;
}

export function CreateClassForm({ schoolId, onSuccess }: CreateClassFormProps) {
  const [open, setOpen] = useState(false);
  const [educationStages, setEducationStages] = useState<EducationStage[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedLetter, setSelectedLetter] = useState<string>("");
  const { toast } = useToast();

  const letters = Array.from({ length: 16 }, (_, i) => 
    String.fromCharCode(65 + i)
  );

  useEffect(() => {
    const fetchEducationStages = async () => {
      try {
        const response = await api.get("/education_stages/");
        setEducationStages(response.data);
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao carregar cursos",
          variant: "destructive",
        });
      }
    };

    fetchEducationStages();
  }, [toast]);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!selectedStage) {
        setGrades([]);
        return;
      }

      try {
        const response = await api.get("/grades/");
        const filteredGrades = response.data.filter(
          (grade: Grade) => grade.education_stage_id === selectedStage
        );
        setGrades(filteredGrades);
      } catch (error) {
        console.error("Error fetching grades:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar séries",
          variant: "destructive",
        });
      }
    };

    fetchGrades();
  }, [selectedStage, toast]);

  const handleSubmit = async () => {
    if (!selectedLetter || !selectedGrade) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.post("/classes", {
        name: selectedLetter,
        school_id: schoolId,
        grade_id: selectedGrade,
      });

      toast({
        title: "Sucesso",
        description: "Turma criada com sucesso",
      });

      setOpen(false);
      setSelectedStage("");
      setSelectedGrade("");
      setSelectedLetter("");
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar turma",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Users className="mr-2 h-4 w-4" />
          Criar Turma
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Nova Turma</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="letter">Letra da Turma</label>
            <Select
              value={selectedLetter}
              onValueChange={setSelectedLetter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a letra" />
              </SelectTrigger>
              <SelectContent>
                {letters.map((letter) => (
                  <SelectItem key={letter} value={letter}>
                    {letter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="stage">Curso</label>
            <Select
              value={selectedStage}
              onValueChange={setSelectedStage}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o curso" />
              </SelectTrigger>
              <SelectContent>
                {educationStages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="grade">Série</label>
            <Select
              value={selectedGrade}
              onValueChange={setSelectedGrade}
              disabled={!selectedStage}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a série" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} className="mt-4">
            Criar Turma
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 