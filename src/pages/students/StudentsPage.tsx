
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import AddStudentModal from "./AddStudentModal";
import { toast } from "@/hooks/use-toast";

// Sample data for initial rendering
const initialStudents = [
  {
    id: "1",
    name: "Ana Silva Oliveira",
    grade: "9º ano",
    classroom: "Turma A",
    registrationDate: "2023-08-15T14:30:00",
  },
  {
    id: "2",
    name: "Pedro Henrique Santos",
    grade: "7º ano",
    classroom: "Turma C",
    registrationDate: "2023-07-20T09:15:00",
  },
  {
    id: "3",
    name: "Mariana Costa Lima",
    grade: "5º ano",
    classroom: "Turma B",
    registrationDate: "2023-09-05T10:45:00",
  },
  {
    id: "4",
    name: "João Gabriel Pereira",
    grade: "8º ano",
    classroom: "Turma A",
    registrationDate: "2023-08-28T13:20:00",
  },
  {
    id: "5",
    name: "Isabela Martins Souza",
    grade: "6º ano",
    classroom: "Turma D",
    registrationDate: "2023-09-10T11:00:00",
  },
];

export interface Student {
  id: string;
  name: string;
  grade: string;
  classroom: string;
  registrationDate: string;
  birthDate?: string;
}

const StudentsPage = () => {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const handleAddStudent = (student: Omit<Student, "id" | "registrationDate">) => {
    const newStudent: Student = {
      ...student,
      id: Date.now().toString(),
      registrationDate: new Date().toISOString(),
    };

    setStudents([newStudent, ...students]);
    toast({
      title: "Aluno adicionado",
      description: `${student.name} foi adicionado com sucesso.`,
    });
    setIsAddModalOpen(false);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsAddModalOpen(true);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents(students.map(s => 
      s.id === updatedStudent.id ? updatedStudent : s
    ));
    toast({
      title: "Aluno atualizado",
      description: `${updatedStudent.name} foi atualizado com sucesso.`,
    });
    setEditingStudent(null);
    setIsAddModalOpen(false);
  };

  const handleDeleteStudent = (id: string) => {
    const studentToDelete = students.find(s => s.id === id);
    if (studentToDelete) {
      setStudents(students.filter(s => s.id !== id));
      toast({
        title: "Aluno removido",
        description: `${studentToDelete.name} foi removido com sucesso.`,
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Alunos</h1>
        <Button 
          onClick={() => {
            setEditingStudent(null);
            setIsAddModalOpen(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Aluno
        </Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Nome completo</TableHead>
              <TableHead>Série</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Data de cadastro</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length > 0 ? (
              students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.grade}</TableCell>
                  <TableCell>{student.classroom}</TableCell>
                  <TableCell>{formatDate(student.registrationDate)}</TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditStudent(student)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student.id)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Excluir</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Nenhum aluno cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AddStudentModal 
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={editingStudent ? handleUpdateStudent : handleAddStudent}
        editingStudent={editingStudent}
      />
    </div>
  );
};

export default StudentsPage;
