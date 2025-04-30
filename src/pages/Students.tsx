
import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, Pencil, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Form schema for student data
const studentSchema = z.object({
  fullName: z.string().min(3, "Nome muito curto").max(100),
  birthDate: z.string().nonempty("Data de nascimento é obrigatória"),
  grade: z.string().nonempty("Série é obrigatória"),
  class: z.string().nonempty("Turma é obrigatória"),
});

type StudentFormData = z.infer<typeof studentSchema>;

// Mock data for students
const mockStudents = [
  {
    id: "1",
    fullName: "Ana Silva",
    grade: "5º Ano",
    class: "A",
    birthDate: "2012-05-10",
    registrationDate: "2022-02-15",
  },
  {
    id: "2",
    fullName: "Pedro Santos",
    grade: "7º Ano",
    class: "B",
    birthDate: "2010-08-22",
    registrationDate: "2021-03-10",
  },
  {
    id: "3",
    fullName: "Mariana Costa",
    grade: "9º Ano",
    class: "A",
    birthDate: "2008-11-15",
    registrationDate: "2020-01-30",
  },
  {
    id: "4",
    fullName: "João Oliveira",
    grade: "4º Ano",
    class: "C",
    birthDate: "2014-02-28",
    registrationDate: "2023-01-05",
  },
  {
    id: "5",
    fullName: "Camila Fernandes",
    grade: "8º Ano",
    class: "D",
    birthDate: "2009-07-17",
    registrationDate: "2021-02-18",
  },
];

export default function Students() {
  const [students, setStudents] = useState(mockStudents);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    formState: { errors: errorsAdd },
    reset: resetAdd,
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: errorsEdit },
    reset: resetEdit,
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const handleAddStudent = (data: StudentFormData) => {
    const newStudent = {
      id: (students.length + 1).toString(),
      fullName: data.fullName,
      grade: data.grade,
      class: data.class,
      birthDate: data.birthDate,
      registrationDate: new Date().toISOString().split("T")[0],
    };

    setStudents([...students, newStudent]);
    setIsAddDialogOpen(false);
    resetAdd();

    toast({
      title: "Aluno adicionado",
      description: `${data.fullName} foi adicionado com sucesso.`,
    });
  };

  const handleEditStudent = (data: StudentFormData) => {
    if (!selectedStudent) return;

    const updatedStudents = students.map((student) =>
      student.id === selectedStudent.id
        ? {
            ...student,
            fullName: data.fullName,
            grade: data.grade,
            class: data.class,
            birthDate: data.birthDate,
          }
        : student
    );

    setStudents(updatedStudents);
    setIsEditDialogOpen(false);
    setSelectedStudent(null);
    resetEdit();

    toast({
      title: "Aluno atualizado",
      description: `${data.fullName} foi atualizado com sucesso.`,
    });
  };

  const handleDeleteStudent = (id: string) => {
    const studentToDelete = students.find((student) => student.id === id);
    const updatedStudents = students.filter((student) => student.id !== id);
    setStudents(updatedStudents);

    toast({
      title: "Aluno removido",
      description: `${studentToDelete?.fullName} foi removido com sucesso.`,
      variant: "destructive",
    });
  };

  const openEditDialog = (student: any) => {
    setSelectedStudent(student);
    setIsEditDialogOpen(true);
    resetEdit({
      fullName: student.fullName,
      birthDate: student.birthDate,
      grade: student.grade,
      class: student.class,
    });
  };

  const filteredStudents = students.filter((student) =>
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-xl md:text-2xl font-bold">Alunos</h1>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar alunos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="whitespace-nowrap">
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Aluno
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] w-[95%] max-w-full sm:w-auto">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Aluno</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do aluno para cadastrá-lo no sistema.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmitAdd(handleAddStudent)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-name">Nome Completo</Label>
                    <Input
                      id="add-name"
                      {...registerAdd("fullName")}
                      placeholder="Nome completo do aluno"
                    />
                    {errorsAdd.fullName && (
                      <p className="text-sm text-red-500">{errorsAdd.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-birthDate">Data de Nascimento</Label>
                    <Input
                      id="add-birthDate"
                      type="date"
                      {...registerAdd("birthDate")}
                    />
                    {errorsAdd.birthDate && (
                      <p className="text-sm text-red-500">{errorsAdd.birthDate.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="add-grade">Série</Label>
                      <Input
                        id="add-grade"
                        {...registerAdd("grade")}
                        placeholder="Ex: 5º Ano"
                      />
                      {errorsAdd.grade && (
                        <p className="text-sm text-red-500">{errorsAdd.grade.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="add-class">Turma</Label>
                      <Input
                        id="add-class"
                        {...registerAdd("class")}
                        placeholder="Ex: A"
                      />
                      {errorsAdd.class && (
                        <p className="text-sm text-red-500">{errorsAdd.class.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        resetAdd();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">Adicionar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden overflow-x-auto">
          <div className="min-w-full">
            <Table>
              <TableCaption>Lista de alunos cadastrados</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Nome Completo</TableHead>
                  <TableHead className="hidden sm:table-cell">Série</TableHead>
                  <TableHead className="hidden md:table-cell">Turma</TableHead>
                  <TableHead className="hidden lg:table-cell">Data de Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.fullName}</TableCell>
                    <TableCell className="hidden sm:table-cell">{student.grade}</TableCell>
                    <TableCell className="hidden md:table-cell">{student.class}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatDate(student.registrationDate)}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
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
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] w-[95%] max-w-full sm:w-auto">
            <DialogHeader>
              <DialogTitle>Editar Aluno</DialogTitle>
              <DialogDescription>
                Edite os dados do aluno conforme necessário.
              </DialogDescription>
            </DialogHeader>

            {selectedStudent && (
              <form onSubmit={handleSubmitEdit(handleEditStudent)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome Completo</Label>
                  <Input
                    id="edit-name"
                    {...registerEdit("fullName")}
                    defaultValue={selectedStudent.fullName}
                  />
                  {errorsEdit.fullName && (
                    <p className="text-sm text-red-500">{errorsEdit.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-birthDate">Data de Nascimento</Label>
                  <Input
                    id="edit-birthDate"
                    type="date"
                    {...registerEdit("birthDate")}
                    defaultValue={selectedStudent.birthDate}
                  />
                  {errorsEdit.birthDate && (
                    <p className="text-sm text-red-500">{errorsEdit.birthDate.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-grade">Série</Label>
                    <Input
                      id="edit-grade"
                      {...registerEdit("grade")}
                      defaultValue={selectedStudent.grade}
                    />
                    {errorsEdit.grade && (
                      <p className="text-sm text-red-500">{errorsEdit.grade.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-class">Turma</Label>
                    <Input
                      id="edit-class"
                      {...registerEdit("class")}
                      defaultValue={selectedStudent.class}
                    />
                    {errorsEdit.class && (
                      <p className="text-sm text-red-500">{errorsEdit.class.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setSelectedStudent(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar Alterações</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
