import { useState, useEffect, useCallback } from "react";
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
import { getRoleDisplayName } from "@/lib/constants";

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
    return ['admin', 'tecadm'].includes(user.role);
  };

  // Buscar vínculos da escola
  const fetchLinks = useCallback(async () => {
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
  }, [schoolId, toast]);

  useEffect(() => {
    if (!isOpen) return;
    fetchLinks();
  }, [isOpen, fetchLinks]);

  // Se não tem permissão, não renderizar o modal
  if (!canManageLinks()) {
    return null;
  }

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
      <DialogContent className="w-[95vw] max-w-6xl h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-red-50">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg sm:text-xl">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              <span className="font-semibold">Gerenciar Vínculos</span>
            </div>
            <span className="text-base sm:text-lg font-medium text-orange-700 sm:ml-2">
              {schoolName}
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-muted-foreground mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span>Visualize e gerencie diretores e coordenadores vinculados à escola</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-4 sm:px-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <span className="text-sm sm:text-base text-muted-foreground">Carregando vínculos...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 h-full overflow-y-auto pr-2 pb-4 scroll-smooth mt-4">
              {/* Directors Section */}
              <div className="flex flex-col min-h-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                    <span>Diretores</span>
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {directors.length}
                    </Badge>
                  </h3>
                </div>

                <div className="border rounded-lg flex-1 overflow-hidden bg-card border-border">
                  {directors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 sm:p-8 h-full min-h-[200px]">
                      <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-full mb-4">
                        <Users className="h-6 w-6 sm:h-8 sm:w-8 text-red-400 dark:text-red-500" />
                      </div>
                      <p className="text-sm sm:text-base text-muted-foreground text-center">
                        Nenhum diretor vinculado
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground text-center mt-1">
                        Use o sistema de vínculos para adicionar diretores
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 sm:p-4 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-red-300 scrollbar-track-red-50 dark:scrollbar-thumb-red-800 dark:scrollbar-track-red-950/30 hover:scrollbar-thumb-red-400 dark:hover:scrollbar-thumb-red-700 scroll-smooth">
                      <div className="space-y-2 sm:space-y-3">
                        {directors.map((link) => (
                          <div
                            key={link.user.id}
                            className="flex items-center gap-3 p-3 sm:p-4 border rounded-lg hover:bg-muted transition-colors border-border"
                          >
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center">
                                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm sm:text-base truncate text-foreground">
                                {link.user.name}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground truncate">
                                {link.user.email}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Matrícula: {link.user.registration}
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 flex-shrink-0">
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                Diretor
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-red-50"
                                onClick={() => handleRemoveLink(link.user.id)}
                                disabled={isRemoving === link.user.id}
                              >
                                {isRemoving === link.user.id ? (
                                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-red-600" />
                                ) : (
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Coordinators Section */}
              <div className="flex flex-col min-h-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                    <span>Coordenadores</span>
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {coordinators.length}
                    </Badge>
                  </h3>
                </div>

                <div className="border rounded-lg flex-1 overflow-hidden bg-card border-border">
                  {coordinators.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 sm:p-8 h-full min-h-[200px]">
                      <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-full mb-4">
                        <Users className="h-6 w-6 sm:h-8 sm:w-8 text-orange-400 dark:text-orange-500" />
                      </div>
                      <p className="text-sm sm:text-base text-muted-foreground text-center">
                        Nenhum coordenador vinculado
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground text-center mt-1">
                        Use o sistema de vínculos para adicionar coordenadores
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 sm:p-4 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-orange-50 dark:scrollbar-thumb-orange-800 dark:scrollbar-track-orange-950/30 hover:scrollbar-thumb-orange-400 dark:hover:scrollbar-thumb-orange-700 scroll-smooth">
                      <div className="space-y-2 sm:space-y-3">
                        {coordinators.map((link) => (
                          <div
                            key={link.user.id}
                            className="flex items-center gap-3 p-3 sm:p-4 border rounded-lg hover:bg-muted transition-colors border-border"
                          >
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 dark:bg-orange-950/30 rounded-full flex items-center justify-center">
                                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm sm:text-base truncate text-foreground">
                                {link.user.name}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground truncate">
                                {link.user.email}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Matrícula: {link.user.registration}
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 flex-shrink-0">
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                Coordenador
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-orange-50"
                                onClick={() => handleRemoveLink(link.user.id)}
                                disabled={isRemoving === link.user.id}
                              >
                                {isRemoving === link.user.id ? (
                                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-orange-600" />
                                ) : (
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-4 sm:px-6 py-4 border-t bg-muted/50 border-border">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto h-10"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
