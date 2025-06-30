import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, Edit, Trash2, Building, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface City {
  id: string;
  name: string;
  state: string;
}

interface Instituicao {
  id: string;
  name: string;
  address?: string;
  domain?: string;
  city_id?: string;
  city?: {
    id: string;
    name: string;
    state: string;
  };
  created_at?: string;
}

interface FormData {
  name: string;
  address: string;
  domain: string;
  city_id: string;
}

export default function Instituicao() {
  const [searchTerm, setSearchTerm] = useState("");
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Instituicao | null>(null);
  const [deletingItem, setDeletingItem] = useState<Instituicao | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    address: "",
    domain: "",
    city_id: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchInstituicoes();
    fetchCities();
  }, []);

  const fetchInstituicoes = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/school");
      setInstituicoes(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar instituições:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar instituições. Verifique sua conexão.",
        variant: "destructive",
      });
      setInstituicoes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await api.get("/city/");
      setCities(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar cidades:", error);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({ name: "", address: "", domain: "", city_id: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Instituicao) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      address: item.address || "",
      domain: item.domain || "",
      city_id: item.city_id || "",
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (item: Instituicao) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editingItem) {
        // Editar
        await api.put(`/school/${editingItem.id}`, formData);
        toast({
          title: "Sucesso",
          description: "Instituição atualizada com sucesso!",
        });
      } else {
        // Criar
        await api.post("/school", formData);
        toast({
          title: "Sucesso",
          description: "Instituição criada com sucesso!",
        });
      }
      
      setIsModalOpen(false);
      fetchInstituicoes();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao salvar instituição",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      setIsSubmitting(true);
      await api.delete(`/school/${deletingItem.id}`);
      toast({
        title: "Sucesso",
        description: "Instituição excluída com sucesso!",
      });
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchInstituicoes();
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao excluir instituição",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInstituicoes = instituicoes.filter(instituicao =>
    instituicao.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (instituicao.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (instituicao.domain || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (instituicao.city?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-64" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-6 w-12" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-2 mt-4">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Instituições</h1>
          <p className="text-muted-foreground">
            Cadastre e gerencie as instituições de ensino
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Instituição
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar instituições..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          onClick={fetchInstituicoes}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Atualizar"
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredInstituicoes.map((instituicao) => (
          <Card key={instituicao.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Building className="h-5 w-5 text-orange-600" />
                {instituicao.name}
              </CardTitle>
              <Badge variant="default">
                Ativa
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {instituicao.city?.name ? `${instituicao.city.name} - ${instituicao.city.state}` : "Localização não definida"}
                  </p>
                  {instituicao.domain && (
                    <p className="text-sm text-muted-foreground">
                      Domínio: {instituicao.domain}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditModal(instituicao)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openDeleteDialog(instituicao)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInstituicoes.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? "Nenhuma instituição encontrada" : "Nenhuma instituição cadastrada"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm 
                ? "Tente ajustar sua pesquisa" 
                : "Comece criando sua primeira instituição no sistema"}
            </p>
            {!searchTerm && (
              <Button onClick={openCreateModal}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova Instituição
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Criar/Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Instituição" : "Nova Instituição"}
            </DialogTitle>
            <DialogDescription>
              {editingItem 
                ? "Atualize as informações da instituição" 
                : "Preencha os dados para criar uma nova instituição"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Nome da instituição"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Endereço completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domínio</Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData({...formData, domain: e.target.value})}
                placeholder="www.exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Select value={formData.city_id} onValueChange={(value) => setFormData({...formData, city_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma cidade" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name} - {city.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  editingItem ? "Atualizar" : "Criar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a instituição "{deletingItem?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
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