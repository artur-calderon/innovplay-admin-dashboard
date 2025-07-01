import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, Edit, Trash2, Users, Building, Loader2, AlertCircle } from "lucide-react";
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

interface School {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
}

interface Turma {
  id: string;
  name: string;
  school_id: string;
  grade_id?: string;
  students_count?: number;
  school?: {
    id: string;
    name: string;
  };
  grade?: {
    id: string;
    name: string;
  };
}

interface FormData {
  name: string;
  school_id: string;
  grade_id?: string;
}

export default function Turmas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Turma | null>(null);
  const [deletingItem, setDeletingItem] = useState<Turma | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    school_id: "",
    grade_id: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTurmas();
    fetchSchools();
    fetchGrades();
  }, []);

  const fetchTurmas = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/classes");
      setTurmas(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar turmas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar turmas. Verifique sua conexão.",
        variant: "destructive",
      });
      setTurmas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get("/school");
      setSchools(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar escolas:", error);
    }
  };

  const fetchGrades = async () => {
    try {
      const response = await api.get("/grades/");
      setGrades(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar séries:", error);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({ name: "", school_id: "", grade_id: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Turma) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      school_id: item.school_id,
      grade_id: item.grade_id || "",
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (item: Turma) => {
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

    if (!formData.school_id) {
      toast({
        title: "Erro",
        description: "Escola é obrigatória",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        name: formData.name,
        school_id: formData.school_id,
        grade_id: formData.grade_id || null,
      };
      
      if (editingItem) {
        // Atualizar turma existente
        await api.put(`/classes/${editingItem.id}`, payload);
        toast({
          title: "Sucesso",
          description: "Turma atualizada com sucesso!",
        });
      } else {
        // Criar nova turma
        await api.post("/classes", payload);
        toast({
          title: "Sucesso",
          description: "Turma criada com sucesso!",
        });
      }
      
      setIsModalOpen(false);
      fetchTurmas(); // Recarregar a lista
    } catch (error: any) {
      console.error("Erro ao salvar turma:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao salvar turma",
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
      await api.delete(`/classes/${deletingItem.id}`);
      toast({
        title: "Sucesso",
        description: "Turma excluída com sucesso!",
      });
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchTurmas(); // Recarregar a lista
    } catch (error: any) {
      console.error("Erro ao excluir turma:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao excluir turma",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTurmas = turmas.filter(turma =>
    turma.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (turma.school?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (turma.grade?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
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
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-16" />
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
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Turmas</h1>
          <p className="text-muted-foreground">
            Cadastre e gerencie as turmas das escolas
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Turma
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar turmas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          onClick={fetchTurmas}
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
        {filteredTurmas.map((turma) => (
          <Card key={turma.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                {turma.name}
              </CardTitle>
              <Badge variant="default">
                Ativa
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {turma.school?.name || "Escola não definida"}
                  </p>
                </div>
                {turma.grade && (
                  <div>
                    <p className="text-sm">
                      <strong>Série:</strong> {turma.grade.name}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{turma.students_count || 0} alunos</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditModal(turma)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openDeleteDialog(turma)}
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

      {filteredTurmas.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? "Nenhuma turma encontrada" : "Nenhuma turma cadastrada"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm 
                ? "Tente ajustar sua pesquisa" 
                : "Comece criando sua primeira turma no sistema"}
            </p>
            {!searchTerm && (
              <Button onClick={openCreateModal}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova Turma
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
              {editingItem ? "Editar Turma" : "Nova Turma"}
            </DialogTitle>
            <DialogDescription>
              {editingItem 
                ? "Atualize as informações da turma" 
                : "Preencha os dados para criar uma nova turma"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Turma *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: 5º Ano A"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school">Escola *</Label>
              <Select 
                value={formData.school_id} 
                onValueChange={(value) => setFormData({...formData, school_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma escola" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">Série (Opcional)</Label>
              <Select 
                value={formData.grade_id || ""} 
                onValueChange={(value) => setFormData({...formData, grade_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma série" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma série</SelectItem>
                  {grades.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
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
              Tem certeza que deseja excluir a turma "{deletingItem?.name}"? 
              Esta ação não pode ser desfeita e todos os alunos associados serão removidos da turma.
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