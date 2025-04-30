
import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StudentForm } from "@/components/students/StudentForm";
import { useToast } from "@/hooks/use-toast";

// Mock data
const mockStudents = [
  {
    id: "1",
    name: "Ana Silva Oliveira",
    grade: "9º Ano",
    classroom: "Turma A",
    registrationDate: "2023-03-15",
  },
  {
    id: "2",
    name: "Pedro Almeida Santos",
    grade: "7º Ano",
    classroom: "Turma B",
    registrationDate: "2023-02-10",
  },
  {
    id: "3",
    name: "Maria Fernanda Costa",
    grade: "5º Ano",
    classroom: "Turma C",
    registrationDate: "2023-04-22",
  },
  {
    id: "4",
    name: "João Paulo Mendes",
    grade: "8º Ano",
    classroom: "Turma A",
    registrationDate: "2023-01-30",
  },
  {
    id: "5",
    name: "Carla Beatriz Ferreira",
    grade: "6º Ano",
    classroom: "Turma D",
    registrationDate: "2023-05-05",
  },
];

export default function Students() {
  const [students, setStudents] = useState(mockStudents);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const { toast } = useToast();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const handleAddStudent = (newStudent: any) => {
    const studentWithId = {
      ...newStudent,
      id: (students.length + 1).toString(),
      registrationDate: new Date().toISOString().split("T")[0],
    };
    
    setStudents([...students, studentWithId]);
    setIsAddDialogOpen(false);
    
    toast({
      title: "Aluno adicionado",
      description: `${newStudent.name} foi adicionado com sucesso.`,
    });
  };

  const handleEditStudent = (updatedStudent: any) => {
    const updatedStudents = students.map((student) =>
      student.id === selectedStudent.id ? { ...student, ...updatedStudent } : student
    );
    
    setStudents(updatedStudents);
    setIsEditDialogOpen(false);
    setSelectedStudent(null);
    
    toast({
      title: "Aluno atualizado",
      description: `${updatedStudent.name} foi atualizado com sucesso.`,
    });
  };

  const handleDeleteStudent = (id: string) => {
    const studentToDelete = students.find(student => student.id === id);
    const updatedStudents = students.filter((student) => student.id !== id);
    setStudents(updatedStudents);
    
    toast({
      title: "Aluno removido",
      description: `${studentToDelete?.name} foi removido com sucesso.`,
      variant: "destructive",
    });
  };

  const openEditDialog = (student: any) => {
    setSelectedStudent(student);
    setIsEditDialogOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Alunos</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Adicionar Aluno
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Adicionar Aluno</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo aluno no formulário abaixo
                </DialogDescription>
              </DialogHeader>
              <StudentForm onSubmit={handleAddStudent} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <Table>
            <TableCaption>Lista de alunos cadastrados</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Nome completo</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Data de cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.grade}</TableCell>
                  <TableCell>{student.classroom}</TableCell>
                  <TableCell>{formatDate(student.registrationDate)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(student)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStudent(student.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Aluno</DialogTitle>
              <DialogDescription>
                Atualize os dados do aluno no formulário abaixo
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <StudentForm
                initialValues={selectedStudent}
                onSubmit={handleEditStudent}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
