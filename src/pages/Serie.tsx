import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, Edit, Trash2, GraduationCap, Loader2, AlertCircle } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EducationStage {
  id: string;
  name: string;
}

interface Serie {
  id: string;
  name: string;
  education_stage_id: string;
  education_stage?: {
    id: string;
    name: string;
  };
}

interface FormData {
  name: string;
  education_stage_id: string;
}

export default function Serie() {
  const [searchTerm, setSearchTerm] = useState("");
  const [series, setSeries] = useState<Serie[]>([]);
  const [educationStages, setEducationStages] = useState<EducationStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Serie | null>(null);
  const [deletingItem, setDeletingItem] = useState<Serie | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    education_stage_id: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSeries();
    fetchEducationStages();
  }, []);

  const fetchSeries = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/grades/");
      setSeries(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar séries:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar séries. Verifique sua conexão.",
        variant: "destructive",
      });
      setSeries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEducationStages = async () => {
    try {
      const response = await api.get("/education_stages");
      setEducationStages(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar etapas de ensino:", error);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({ name: "", education_stage_id: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Serie) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      education_stage_id: item.education_stage_id,
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (item: Serie) => {
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

    if (!formData.education_stage_id) {
      toast({
        title: "Erro",
        description: "Etapa de ensino é obrigatória",
        variant: "destructive",
      });
      return;
    }

    // Simulação - endpoints não implementados no backend
    toast({
      title: "Funcionalidade não implementada",
      description: "Os endpoints CRUD para séries ainda não foram implementados no backend. Entre em contato com o desenvolvedor.",
      variant: "destructive",
    });
    
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    // Simulação - endpoints não implementados no backend
    toast({
      title: "Funcionalidade não implementada",
      description: "Os endpoints CRUD para séries ainda não foram implementados no backend. Entre em contato com o desenvolvedor.",
      variant: "destructive",
    });
    
    setIsDeleteDialogOpen(false);
    setDeletingItem(null);
  };

  const filteredSeries = series.filter(serie =>
    serie.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (serie.education_stage?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Séries</h1>
          <p className="text-muted-foreground">
            Cadastre e gerencie as séries por etapa de ensino
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Série
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Aviso:</strong> Os botões de editar e excluir estão disponíveis na interface, mas os endpoints CRUD para séries ainda não foram implementados no backend. Entre em contato com o desenvolvedor para implementar essas funcionalidades.
        </AlertDescription>
      </Alert>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar séries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          onClick={fetchSeries}
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
        {filteredSeries.map((serie) => (
          <Card key={serie.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                {serie.name}
              </CardTitle>
              <Badge variant="default">
                Ativa
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {serie.education_stage?.name || "Etapa não definida"}
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditModal(serie)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openDeleteDialog(serie)}
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

      {filteredSeries.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? "Nenhuma série encontrada" : "Nenhuma série cadastrada"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm 
                ? "Tente ajustar sua pesquisa" 
                : "Comece criando sua primeira série no sistema"}
            </p>
            {!searchTerm && (
              <Button onClick={openCreateModal}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova Série
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
              {editingItem ? "Editar Série" : "Nova Série"}
            </DialogTitle>
            <DialogDescription>
              {editingItem 
                ? "Atualize as informações da série" 
                : "Preencha os dados para criar uma nova série"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Nome da série"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="education_stage">Etapa de Ensino *</Label>
              <Select 
                value={formData.education_stage_id} 
                onValueChange={(value) => setFormData({...formData, education_stage_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma etapa de ensino" />
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
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta funcionalidade ainda não foi implementada no backend. Os endpoints CRUD para séries precisam ser criados.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingItem ? "Atualizar" : "Criar"}
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
              Tem certeza que deseja excluir a série "{deletingItem?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 