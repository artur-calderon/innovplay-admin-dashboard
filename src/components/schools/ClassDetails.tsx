import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye, Pencil, Trash2, Loader2, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Student {
  id: string;
  name: string;
  registration: string;
  birth_date: string;
  user_id: string;
  user?: {
    email: string;
  };
}

interface Class {
  id: string;
  name: string;
  school_id: string;
  grade_id: string;
}

interface Grade {
  id: string;
  name: string;
  education_stage_id: string;
}

export default function ClassDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        // Fetch class details to get school_id
        const classResponse = await api.get(`/classes/${id}`);
        const classData = classResponse.data;

        // Fetch students in the class
        const studentsResponse = await api.get(`/students/school/${classData.school_id}/class/${id}`);
        setStudents(studentsResponse.data);

        // Fetch all classes in the same school
        const classesResponse = await api.get(`/classes/school/${classData.school_id}`);
        setClasses(classesResponse.data.filter((c: Class) => c.id !== id)); // Exclude current class

        // Fetch grades
        const gradesResponse = await api.get("/grades/");
        const gradesMap: Record<string, string> = {};
        gradesResponse.data.forEach((grade: Grade) => {
          gradesMap[grade.id] = grade.name;
        });
        setGrades(gradesMap);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados da turma",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, toast]);

  const handleRemoveStudent = async (studentId: string) => {
    if (!id) return;
    try {
      await api.put(`/classes/${id}/remove_student`, { student_id: studentId });
      setStudents(students.filter(student => student.id !== studentId));
      toast({
        title: "Sucesso",
        description: "Aluno removido da turma com sucesso",
      });
    } catch (error) {
      console.error("Error removing student:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover aluno da turma",
        variant: "destructive",
      });
    }
  };

  const handleMoveStudent = async () => {
    if (!id || !selectedStudent || !selectedClass) return;
    try {
      // Remove from current class
      await api.put(`/classes/${id}/remove_student`, { student_id: selectedStudent.id });
      // Add to new class
      await api.put(`/classes/${selectedClass}/add_student`, { student_id: selectedStudent.id });
      
      setStudents(students.filter(student => student.id !== selectedStudent.id));
      setIsEditDialogOpen(false);
      setSelectedStudent(null);
      setSelectedClass("");
      
      toast({
        title: "Sucesso",
        description: "Aluno movido para nova turma com sucesso",
      });
    } catch (error) {
      console.error("Error moving student:", error);
      toast({
        title: "Erro",
        description: "Erro ao mover aluno para nova turma",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Detalhes da Turma</h1>
      </div>

      <div className="p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Alunos</h2>
        {students.length === 0 ? (
          <p className="text-gray-500">Nenhum aluno cadastrado nesta turma</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[150px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.registration || "-"}</TableCell>
                  <TableCell>{student.user?.email || "-"}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedStudent(student);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedStudent(student);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Move Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mover Aluno para Outra Turma</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label>Selecione a nova turma</label>
              <Select
                value={selectedClass}
                onValueChange={setSelectedClass}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name} - {grades[classItem.grade_id] || "Carregando..."}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleMoveStudent} className="mt-4">
              Mover Aluno
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o aluno {selectedStudent?.name} desta turma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (selectedStudent) {
                  handleRemoveStudent(selectedStudent.id);
                  setIsDeleteDialogOpen(false);
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 