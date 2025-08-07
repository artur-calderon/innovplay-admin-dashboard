import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Loader2, Users, Building, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/authContext";

interface SchoolLink {
  manager: {
    id: string;
    name: string;
    registration: string;
    birth_date: string;
    profile_picture?: string;
    school_id: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    registration: string;
    role: string;
  };
  school: {
    id: string;
    name: string;
  };
}

interface ManageSchoolLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
  onSuccess: () => void;
}

export function ManageSchoolLinksModal({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  onSuccess,
}: ManageSchoolLinksModalProps) {
  const [links, setLinks] = useState<SchoolLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Verificar permissões para gerenciar vínculos
  const canManageLinks = () => {
    if (!user) return false;
    
    // Apenas admin e tecadm podem gerenciar vínculos
    return ['admin', 'tecadmin'].includes(user.role);
  };

  // Se não tem permissão, não renderizar o modal
  if (!canManageLinks()) {
    return null;
  }

  // Buscar vínculos da escola
  useEffect(() => {
    if (!isOpen) return;

    const fetchLinks = async () => {
      setIsLoading(true);
      try {
        console.log('🔗 Buscando managers da escola:', schoolId);
        const response = await api.get(`/managers/school/${schoolId}`);
        console.log('🔗 Response managers:', response);
        console.log('🔗 Data managers:', response.data);
        
        if (response.data && response.data.managers) {
          console.log('🔗 Managers da escola:', response.data.managers);
          setLinks(response.data.managers);
        } else {
          setLinks([]);
        }
      } catch (error) {
        console.error("Erro ao buscar managers:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar managers da escola",
          variant: "destructive",
        });
        setLinks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinks();
  }, [isOpen, schoolId, toast]);

  const handleRemoveLink = async (userId: string) => {
    setIsRemoving(userId);
    try {
      console.log('🗑️ Remover manager:', userId);
      console.log('🗑️ URL da requisição:', `/managers/school-link/${userId}`);
      
      await api.delete(`/managers/school-link/${userId}`);

      console.log('✅ Manager removido com sucesso!');

      setLinks(prev => prev.filter(link => link.user.id !== userId));
      
      toast({
        title: "Sucesso",
        description: "Manager removido com sucesso!",
      });
      
      onSuccess();
    } catch (error) {
      console.error("Erro ao remover manager:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover manager",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(null);
    }
  };

  const directors = links.filter(link => link.user.role === 'diretor');
  const coordinators = links.filter(link => link.user.role === 'coordenador');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-orange-600" />
            Gerenciar Vínculos da Escola
          </DialogTitle>
          <DialogDescription>
            Visualize e gerencie diretores e coordenadores vinculados à escola <strong>{schoolName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Carregando vínculos...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* Directors Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-red-600" />
                    Diretores ({directors.length})
                  </h3>
                </div>

                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  {directors.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum diretor vinculado</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {directors.map((link) => (
                                                 <div
                           key={link.user.id}
                           className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50"
                         >
                           <div className="flex-1 min-w-0">
                             <div className="font-medium text-sm truncate">{link.user.name}</div>
                             <div className="text-xs text-muted-foreground truncate">
                               {link.user.email}
                             </div>
                             <div className="text-xs text-muted-foreground">
                               Matrícula: {link.user.registration}
                             </div>
                           </div>
                           <div className="flex gap-1">
                             <Badge variant="outline" className="text-xs">Diretor</Badge>
                             <Button
                               variant="outline"
                               size="sm"
                               className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                               onClick={() => handleRemoveLink(link.user.id)}
                               disabled={isRemoving === link.user.id}
                             >
                               {isRemoving === link.user.id ? (
                                 <Loader2 className="h-3 w-3 animate-spin" />
                               ) : (
                                 <Trash2 className="h-3 w-3" />
                               )}
                             </Button>
                           </div>
                         </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Coordinators Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-600" />
                    Coordenadores ({coordinators.length})
                  </h3>
                </div>

                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  {coordinators.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum coordenador vinculado</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {coordinators.map((link) => (
                                                 <div
                           key={link.user.id}
                           className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50"
                         >
                           <div className="flex-1 min-w-0">
                             <div className="font-medium text-sm truncate">{link.user.name}</div>
                             <div className="text-xs text-muted-foreground truncate">
                               {link.user.email}
                             </div>
                             <div className="text-xs text-muted-foreground">
                               Matrícula: {link.user.registration}
                             </div>
                           </div>
                           <div className="flex gap-1">
                             <Badge variant="outline" className="text-xs">Coordenador</Badge>
                             <Button
                               variant="outline"
                               size="sm"
                               className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                               onClick={() => handleRemoveLink(link.user.id)}
                               disabled={isRemoving === link.user.id}
                             >
                               {isRemoving === link.user.id ? (
                                 <Loader2 className="h-3 w-3 animate-spin" />
                               ) : (
                                 <Trash2 className="h-3 w-3" />
                               )}
                             </Button>
                           </div>
                         </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
