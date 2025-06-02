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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Upload, Loader2 } from "lucide-react";
import { AxiosError } from "axios";

interface ApiError {
  error: string;
}

interface Class {
  id: string;
  name: string;
  grade_id: string;
}

interface AddStudentFormProps {
  schoolId: string;
  schoolName: string;
  onSuccess?: () => void;
}

export function AddStudentForm({ schoolId, schoolName, onSuccess }: AddStudentFormProps) {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [name, setName] = useState("");
  const [registration, setRegistration] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await api.get(`/classes/school/${schoolId}`);
        setClasses(response.data);
      } catch (error) {
        console.error("Error fetching classes:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar turmas",
          variant: "destructive",
        });
      }
    };

    if (open) {
      fetchClasses();
    }
  }, [schoolId, open, toast]);

  const generateEmail = (fullName: string) => {
    const names = fullName.toLowerCase().split(" ");
    const initials = names.map(name => name[0]).join("");
    return `${initials}@innovplay.com`;
  };

  const generatePassword = () => {
    const currentYear = new Date().getFullYear();
    const schoolPrefix = schoolName.toLowerCase().replace(/\s+/g, "");
    return `${schoolPrefix}@${currentYear}`;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
  };

  const handleSubmit = async () => {
    if (!name || !selectedClass || !birthDate) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const selectedClassData = classes.find(c => c.id === selectedClass);
    if (!selectedClassData) return;

    setIsLoading(true);
    try {
      // Single call to create user (if not exists) and student
      const response = await api.post("/students", {
        name,
        email: generateEmail(name), // Include email and password
        password: generatePassword(),
        registration: registration || undefined,
        birth_date: birthDate,
        class_id: selectedClass,
        grade_id: selectedClassData.grade_id,
        city_id: schoolId, // Add city_id using schoolId
      });


      toast({
        title: "Sucesso",
        description: "Aluno adicionado com sucesso", // Message might vary based on backend response
      });

      setOpen(false);
      setName("");
      setRegistration("");
      setBirthDate("");
      setSelectedClass("");
      onSuccess?.();
    } catch (error) {
      console.error("Error adding student:", error);
      const axiosError = error as AxiosError<ApiError>;
      toast({
        title: "Erro",
        description: axiosError.response?.data?.error || "Erro ao adicionar aluno",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo CSV",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", csvFile);
    formData.append("school_id", schoolId);

    try {
      await api.post("/students/csv", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast({
        title: "Sucesso",
        description: "Alunos importados com sucesso",
      });

      setOpen(false);
      setCsvFile(null);
      onSuccess?.();
    } catch (error) {
      console.error("Error uploading CSV:", error);
      const axiosError = error as AxiosError<ApiError>;
      toast({
        title: "Erro",
        description: axiosError.response?.data?.error || "Erro ao importar alunos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Aluno
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Aluno</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="csv">CSV</TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="Digite o nome completo"
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={name ? generateEmail(name) : ""}
                  readOnly
                  className="bg-muted"
                  placeholder="Email será gerado automaticamente"
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  value={generatePassword()}
                  readOnly
                  className="bg-muted"
                  placeholder="Senha será gerada automaticamente"
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="registration">Matrícula (opcional)</Label>
                <Input
                  id="registration"
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                  placeholder="Digite a matrícula"
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="birthDate">Data de Nascimento *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="class">Turma *</Label>
                <Select 
                  value={selectedClass} 
                  onValueChange={setSelectedClass}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleSubmit} 
                className="mt-4"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Adicionar Aluno"
                )}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="csv" className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="csv">Arquivo CSV</Label>
                <Input
                  id="csv"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  disabled={isLoading}
                />
              </div>
              <Button 
                onClick={handleCsvUpload} 
                className="mt-4"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar CSV
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 