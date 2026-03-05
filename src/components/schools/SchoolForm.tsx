import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building } from "lucide-react";

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

    if (!formData.name.trim() || !formData.address.trim() || !formData.city_id) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, endereço e município antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      onSave(formData);
    } catch (error) {
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
      <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Building className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            {school ? "Editar Escola" : "Nova Escola"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 py-4" autoComplete="off">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                Nome da Escola
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isLoading || isDeleting}
                autoComplete="off"
                className="h-11"
                placeholder="Nome completo da instituição"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain" className="flex items-center gap-1">
                Domínio
              </Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                disabled={isLoading || isDeleting}
                autoComplete="off"
                className="h-11"
                placeholder="exemplo.com.br"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-1">
              Endereço
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              disabled={isLoading || isDeleting}
              autoComplete="off"
              className="h-11"
              placeholder="Endereço completo da escola"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city" className="flex items-center gap-1">
              Município
              <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.city_id}
              onValueChange={(value) => setFormData({ ...formData, city_id: value })}
              disabled={isLoading || isDeleting}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione um município" />
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
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            {school && onDelete && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isLoading || isDeleting}
                className="h-11 order-3 sm:order-1"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Excluir Escola"
                )}
              </Button>
            )}
            <div className="flex flex-col sm:flex-row gap-3 flex-1 sm:justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={isLoading || isDeleting}
                className="h-11 order-2 sm:order-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || isDeleting}
                className="h-11 order-1 sm:order-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  school ? "Salvar Alterações" : "Criar Escola"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}