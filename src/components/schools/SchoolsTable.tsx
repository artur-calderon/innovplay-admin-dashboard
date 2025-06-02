import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Plus, Building, Eye, Search, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";
import SchoolForm from "./SchoolForm";
import { useDataContext } from "@/context/dataContext";
import { api } from "@/lib/api";

interface City {
  id: string;
  name: string;
  state: string;
  created_at: string;
}

interface School {
  id: string;
  name: string;
  city_id: string;
  address: string;
  domain: string;
  created_at: string;
  city: City;
}

export default function SchoolsTable() {
  const navigate = useNavigate();
  const { escolas, getEscolas } = useDataContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);

  useEffect(() => {
    const fetchSchools = async () => {
      setIsLoadingSchools(true);
      try {
        await getEscolas();
      } finally {
        setIsLoadingSchools(false);
      }
    };
    fetchSchools();
  }, [getEscolas]);

  // Filter schools based on search query
  const filteredSchools = escolas?.filter((school) =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handler for adding a school
  const handleAddSchool = (schoolData: School) => {
    getEscolas(); // Refresh the schools list
    setIsAddDialogOpen(false);
  };

  // Handler for editing a school
  const handleEditSchool = (schoolData: School) => {
    getEscolas(); // Refresh the schools list
    setIsEditDialogOpen(false);
    toast.success("Escola atualizada com sucesso!");
  };

  // Handler for deleting a school
  const handleDeleteSchool = () => {
    if (!currentSchool) return;
    getEscolas(); // Refresh the schools list
    setIsDeleteDialogOpen(false);
    toast.success("Escola removida com sucesso!");
  };

  // Handler for viewing a school
  const handleViewSchool = (schoolId: string) => {
    navigate(`/app/escola/${schoolId}`);
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

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar escolas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {isLoadingSchools ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Domínio</TableHead>
              <TableHead className="w-[150px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredSchools || filteredSchools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  <div className="flex flex-col items-center gap-2">
                    <Building className="h-10 w-10 text-gray-400" />
                    <h3 className="font-medium text-lg">
                      {searchQuery ? "Nenhuma escola encontrada" : "Nenhuma escola cadastrada"}
                    </h3>
                    <p className="text-gray-500">
                      {searchQuery
                        ? "Tente uma busca diferente ou adicione uma nova escola."
                        : "Adicione uma nova escola para começar."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredSchools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell>{school.city.name}</TableCell>
                  <TableCell>{school.address}</TableCell>
                  <TableCell>{school.domain}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleViewSchool(school.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
      )}

      {/* Add School Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Escola</DialogTitle>
          </DialogHeader>
          <SchoolForm 
            onClose={() => setIsAddDialogOpen(false)}
            onSave={(school) => {
              handleAddSchool(school);
              setIsAddDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit School Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Escola</DialogTitle>
          </DialogHeader>
          <SchoolForm 
            school={currentSchool || undefined}
            onClose={() => setIsEditDialogOpen(false)}
            onSave={(school) => {
              handleEditSchool(school);
              setIsEditDialogOpen(false);
            }}
          />
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