import { useState, useEffect } from "react";
import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, Edit, Trash2, BookOpen, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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

interface Disciplina {
  id: string;
  name: string;
}

interface FormData {
  name: string;
}

export function InstituicaoDisciplinasTab() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Disciplina | null>(null);
  const [deletingItem, setDeletingItem] = useState<Disciplina | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const canEdit = user?.role === "admin" || user?.role === "tecadm";

  const fetchDisciplinas = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/subjects");
      const data = response.data;
      const list = Array.isArray(data) ? data : data?.data ?? data?.subjects ?? [];
      setDisciplinas(
        list.map((s: { id: string; name?: string; nome?: string }) => ({
          id: String(s.id),
          name: s.name ?? s.nome ?? "",
        }))
      );
    } catch (error) {
      console.error("Erro ao buscar disciplinas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar disciplinas. Verifique sua conexão.",
        variant: "destructive",
      });
      setDisciplinas([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisciplinas();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({ name: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Disciplina) => {
    setEditingItem(item);
    setFormData({ name: item.name });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (item: Disciplina) => {
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
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await api.put(`/subjects/${editingItem.id}`, { name: formData.name.trim() });
        toast({ title: "Sucesso", description: "Disciplina atualizada com sucesso.", variant: "default" });
      } else {
        await api.post("/subjects", { name: formData.name.trim() });
        toast({ title: "Sucesso", description: "Disciplina criada com sucesso.", variant: "default" });
      }
      setIsModalOpen(false);
      fetchDisciplinas();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({
        title: "Erro",
        description: msg || (editingItem ? "Erro ao atualizar disciplina." : "Erro ao criar disciplina."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/subjects/${deletingItem.id}`);
      toast({ title: "Sucesso", description: "Disciplina excluída com sucesso.", variant: "default" });
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchDisciplinas();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({
        title: "Erro",
        description: msg || "Erro ao excluir disciplina.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDisciplinas = disciplinas.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        {canEdit && (
          <Button onClick={openCreateModal} className="w-full sm:w-auto shrink-0">
            <PlusCircle className="h-4 w-4 mr-2" />
            Nova Disciplina
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar disciplinas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Button variant="outline" onClick={fetchDisciplinas} disabled={isLoading} className="shrink-0">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-9 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDisciplinas.map((disciplina) => (
            <Card key={disciplina.id} className="hover:shadow-md transition-shadow border-[#E5D5EA] dark:border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#7B3FE4]" />
                  {disciplina.name}
                </CardTitle>
                <Badge variant="secondary">Ativa</Badge>
              </CardHeader>
              <CardContent>
                {canEdit && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(disciplina)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(disciplina)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredDisciplinas.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? "Nenhuma disciplina encontrada" : "Nenhuma disciplina cadastrada"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm ? "Tente ajustar sua pesquisa." : "Adicione disciplinas para usar em avaliações e turmas."}
            </p>
            {!searchTerm && canEdit && (
              <Button onClick={openCreateModal}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova Disciplina
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Disciplina" : "Nova Disciplina"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Atualize o nome da disciplina." : "Preencha o nome para criar uma nova disciplina."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disciplina-name">Nome *</Label>
              <Input
                id="disciplina-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Matemática, Língua Portuguesa"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingItem ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a disciplina &quot;{deletingItem?.name}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
