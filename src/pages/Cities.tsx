import { useState, useEffect } from "react";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Building2, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";

interface City {
  id: string;
  name: string;
  state: string;
  created_at: string;
}

export default function Cities() {
  const { user } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [newCity, setNewCity] = useState({
    name: "",
    state: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchCities = async () => {
      setIsLoading(true);
      try {
        const response = await api.get("/city/");
        let citiesData = response.data;

        // Se não for admin, filtra apenas o município do usuário
        if (user.role !== 'admin') {
          citiesData = citiesData.filter((city: City) => city.id === user.tenant_id);
        }

        setCities(citiesData);
      } catch (error) {
        console.error("Error fetching cities:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar municípios",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCities();
  }, [user.role, user.tenant_id, toast]);

  const handleAddCity = async () => {
    setIsAdding(true);
    try {
      await api.post("/city/", newCity);
      
      // Fetch updated cities list
      const response = await api.get("/city/");
      let citiesData = response.data;

      // Se não for admin, filtra apenas o município do usuário
      if (user.role !== 'admin') {
        citiesData = citiesData.filter((city: City) => city.id === user.tenant_id);
      }

      setCities(citiesData);
      setIsAddDialogOpen(false);
      setNewCity({ name: "", state: "" });
      toast({
        title: "Sucesso",
        description: "Município criado com sucesso",
      });
    } catch (error) {
      console.error("Error creating city:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar município",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditCity = async () => {
    if (!selectedCity) return;
    setIsEditing(true);

    try {
      await api.put(`/city/${selectedCity.id}`, {
        name: newCity.name,
        state: newCity.state,
      });
      
      // Fetch updated cities list
      const response = await api.get("/city/");
      let citiesData = response.data;

      // Se não for admin, filtra apenas o município do usuário
      if (user.role !== 'admin') {
        citiesData = citiesData.filter((city: City) => city.id === user.tenant_id);
      }

      setCities(citiesData);
      setIsEditDialogOpen(false);
      setSelectedCity(null);
      setNewCity({ name: "", state: "" });
      toast({
        title: "Sucesso",
        description: "Município atualizado com sucesso",
      });
    } catch (error) {
      console.error("Error updating city:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar município",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteCity = async () => {
    if (!selectedCity) return;
    setIsDeleting(true);

    try {
      await api.delete(`/city/${selectedCity.id}`);
      
      // Fetch updated cities list
      const response = await api.get("/city/");
      let citiesData = response.data;

      // Se não for admin, filtra apenas o município do usuário
      if (user.role !== 'admin') {
        citiesData = citiesData.filter((city: City) => city.id === user.tenant_id);
      }

      setCities(citiesData);
      setIsDeleteDialogOpen(false);
      setSelectedCity(null);
      toast({
        title: "Sucesso",
        description: "Município removido com sucesso",
      });
    } catch (error) {
      console.error("Error deleting city:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover município",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter cities based on search query
  const filteredCities = cities?.filter((city) =>
    city.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Municípios</h2>
          {user.role === 'admin' && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Município
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar municípios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                {user.role === 'admin' && <TableHead className="w-[100px]">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filteredCities || filteredCities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={user.role === 'admin' ? 4 : 3} className="text-center py-6">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-10 w-10 text-gray-400" />
                      <h3 className="font-medium text-lg">
                        {searchQuery ? "Nenhum município encontrado" : "Nenhum município cadastrado"}
                      </h3>
                      <p className="text-gray-500">
                        {searchQuery
                          ? "Tente uma busca diferente."
                          : "Não há municípios cadastrados no sistema."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCities.map((city) => (
                  <TableRow key={city.id}>
                    <TableCell className="font-medium">{city.name}</TableCell>
                    <TableCell>{city.state}</TableCell>
                    <TableCell>
                      {new Date(city.created_at + 'Z').toLocaleDateString('pt-BR', {
                        timeZone: 'UTC'
                      })}
                    </TableCell>
                    {user.role === 'admin' && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedCity(city);
                              setNewCity({ name: city.name, state: city.state });
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedCity(city);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add City Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Município</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Município</Label>
              <Input
                id="name"
                value={newCity.name}
                onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                placeholder="Digite o nome do município"
                disabled={isAdding}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={newCity.state}
                onChange={(e) => setNewCity({ ...newCity, state: e.target.value })}
                placeholder="Digite o estado"
                disabled={isAdding}
              />
            </div>
            <Button onClick={handleAddCity} className="mt-4" disabled={isAdding}>
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Município"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit City Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Município</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nome do Município</Label>
              <Input
                id="edit-name"
                value={newCity.name}
                onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                placeholder="Digite o nome do município"
                disabled={isEditing}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-state">Estado</Label>
              <Input
                id="edit-state"
                value={newCity.state}
                onChange={(e) => setNewCity({ ...newCity, state: e.target.value })}
                placeholder="Digite o estado"
                disabled={isEditing}
              />
            </div>
            <Button onClick={handleEditCity} className="mt-4" disabled={isEditing}>
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
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
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o
              município {selectedCity?.name} e removerá os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCity} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 