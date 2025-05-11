import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Plus, Building } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "react-toastify";
import SchoolForm from "./SchoolForm";

// Mock data for schools
const mockSchools = [
  {
    id: 1,
    name: "Escola Municipal João Silva",
    municipality: "São Paulo",
    address: "Rua das Flores, 123",
    domain: "joaosilva.edu.br",
  },
  {
    id: 2,
    name: "Colégio Estadual Maria Oliveira",
    municipality: "Rio de Janeiro",
    address: "Avenida Central, 456",
    domain: "mariaoliveira.edu.br",
  },
  {
    id: 3,
    name: "Instituto Federal de Tecnologia",
    municipality: "Belo Horizonte",
    address: "Praça da Liberdade, 789",
    domain: "iftec.edu.br",
  },
];

export default function SchoolsTable() {
  const [schools, setSchools] = useState(mockSchools);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentSchool, setCurrentSchool] = useState<any>(null);

  // Handler for adding a school
  const handleAddSchool = (schoolData: any) => {
    const newSchool = {
      id: schools.length + 1,
      ...schoolData,
    };
    setSchools([...schools, newSchool]);
    setIsAddDialogOpen(false);
    toast.success("Escola adicionada com sucesso!");
  };

  // Handler for editing a school
  const handleEditSchool = (schoolData: any) => {
    const updatedSchools = schools.map((school) =>
      school.id === schoolData.id ? { ...school, ...schoolData } : school
    );
    setSchools(updatedSchools);
    setIsEditDialogOpen(false);
    toast.success("Escola atualizada com sucesso!");
  };

  // Handler for deleting a school
  const handleDeleteSchool = () => {
    if (!currentSchool) return;
    const filteredSchools = schools.filter(
      (school) => school.id !== currentSchool.id
    );
    setSchools(filteredSchools);
    setIsDeleteDialogOpen(false);
    toast.success("Escola removida com sucesso!");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Escolas</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2" />
          Nova Escola
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Domínio</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  <div className="flex flex-col items-center gap-2">
                    <Building className="h-10 w-10 text-gray-400" />
                    <h3 className="font-medium text-lg">Nenhuma escola encontrada</h3>
                    <p className="text-gray-500">
                      Adicione uma nova escola para começar.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell>{school.municipality}</TableCell>
                  <TableCell>{school.address}</TableCell>
                  <TableCell>{school.domain}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setCurrentSchool(school);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setCurrentSchool(school);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add School Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Escola</DialogTitle>
          </DialogHeader>
          <SchoolForm onSubmit={handleAddSchool} />
        </DialogContent>
      </Dialog>

      {/* Edit School Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Escola</DialogTitle>
          </DialogHeader>
          <SchoolForm school={currentSchool} onSubmit={handleEditSchool} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a
              escola {currentSchool?.name} e removerá os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSchool}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}