import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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

interface SchoolFormProps {
  school?: School;
  onClose: () => void;
  onSave: (school: Partial<School>) => void;
  onDelete?: (schoolId: string) => void;
  isLoading?: boolean;
}

export default function SchoolForm({ school, onClose, onSave, onDelete, isLoading = false }: SchoolFormProps) {
  const [formData, setFormData] = useState({
    name: school?.name || "",
    address: school?.address || "",
    domain: school?.domain || "",
    city_id: school?.city_id || "",
  });
  const [cities, setCities] = useState<City[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await api.get("/city/");
        setCities(response.data);
      } catch (error) {
        console.error("Error fetching cities:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar municípios",
          variant: "destructive",
        });
      }
    };

    fetchCities();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeleting(true);

    try {
      onSave(formData);
    } catch (error) {
      console.error("Error saving school:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = async () => {
    if (!school || !onDelete) return;
    setIsDeleting(true);

    try {
      await api.delete(`/school/${school.id}`);
      onDelete(school.id);
      toast({
        title: "Sucesso",
        description: "Escola excluída com sucesso",
      });
      onClose();
    } catch (error) {
      console.error("Error deleting school:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir escola",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{school ? "Editar Escola" : "Nova Escola"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Escola</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={isLoading || isDeleting}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              disabled={isLoading || isDeleting}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Domínio</Label>
            <Input
              id="domain"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              required
              disabled={isLoading || isDeleting}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Município</Label>
            <select
              id="city"
              value={formData.city_id}
              onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
              className="w-full p-2 border rounded-md"
              required
              disabled={isLoading || isDeleting}
              autoComplete="off"
            >
              <option value="">Selecione um município</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} - {city.state}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            {school && onDelete && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isLoading || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Excluir"
                )}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading || isDeleting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || isDeleting}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}