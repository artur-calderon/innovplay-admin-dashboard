import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/authContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Plus, Eye, CheckCheck } from 'lucide-react';
import { AvisosList } from '@/components/avisos/AvisosList';
import { CreateAvisoForm } from '@/components/avisos/CreateAvisoForm';
import { getFilteredAvisos } from '@/services/avisosApi';
import { canCreateAvisos } from '@/utils/avisosPermissions';
import { useToast } from '@/hooks/use-toast';
import { useUnreadAvisos } from '@/hooks/useUnreadAvisos';
import type { Aviso, AvisosFilters } from '@/types/avisos';

export default function Avisos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visualizar');

  // Permissões do usuário
  const canCreate = canCreateAvisos(user.role);

  // Hook para gerenciar avisos não lidos
  const { getUnreadCount, markAllAsRead } = useUnreadAvisos();

  // Calcular avisos não lidos
  const unreadCount = useMemo(() => {
    const avisoIds = avisos.map(a => a.id);
    return getUnreadCount(avisoIds);
  }, [avisos, getUnreadCount]);

  // Buscar avisos na montagem e quando alternar tabs
  useEffect(() => {
    loadAvisos();
  }, [user.id, user.role]);

  const loadAvisos = async () => {
    setIsLoading(true);
    try {
      // TODO: Buscar IDs reais do contexto do usuário quando integrar com API
      const filters: AvisosFilters = {
        role: user.role,
        user_id: user.id,
        // Estes valores virão do contexto do usuário quando a API estiver pronta
        municipio_id: user.role === 'tecadm' ? 'mun-001' : undefined,
        escola_id: ['diretor', 'coordenador', 'professor', 'aluno'].includes(user.role) ? 'escola-001' : undefined,
      };

      const data = await getFilteredAvisos(filters);
      setAvisos(data);
    } catch (error) {
      console.error('Erro ao carregar avisos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os avisos. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvisoCreated = () => {
    // Recarregar avisos após criar um novo
    loadAvisos();
    // Voltar para tab de visualização
    setActiveTab('visualizar');
    toast({
      title: 'Sucesso',
      description: 'Aviso publicado com sucesso!',
    });
  };

  const handleRefresh = () => {
    loadAvisos();
  };

  const handleMarkAllAsRead = () => {
    const avisoIds = avisos.map(a => a.id);
    markAllAsRead(avisoIds);
    toast({
      title: 'Sucesso',
      description: 'Todos os avisos foram marcados como lidos.',
    });
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-orange-500" />
            Avisos
          </h1>
          <p className="text-gray-600">
            {canCreate 
              ? 'Visualize e gerencie avisos importantes do sistema'
              : 'Visualize avisos importantes do sistema'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {unreadCount} {unreadCount === 1 ? 'novo' : 'novos'}
            </Badge>
          )}
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'}
          </Badge>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Marcar todos como lidos
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      {canCreate ? (
        // Usuários que podem criar avisos veem tabs
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="visualizar" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Avisos
            </TabsTrigger>
            <TabsTrigger value="criar" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Criar Aviso
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visualizar" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Avisos Recentes</CardTitle>
                <CardDescription>
                  Lista de todos os avisos relevantes para você
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AvisosList avisos={avisos} isLoading={isLoading} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="criar" className="mt-6">
            <CreateAvisoForm
              userRole={user.role}
              userId={user.id}
              // TODO: Passar IDs reais quando integrar com API
              userMunicipioId={user.role === 'tecadm' ? 'mun-001' : undefined}
              userEscolaId={['diretor', 'coordenador'].includes(user.role) ? 'escola-001' : undefined}
              onSuccess={handleAvisoCreated}
            />
          </TabsContent>
        </Tabs>
      ) : (
        // Usuários que apenas visualizam não veem tabs
        <Card>
          <CardHeader>
            <CardTitle>Avisos Recentes</CardTitle>
            <CardDescription>
              Lista de todos os avisos relevantes para você
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvisosList avisos={avisos} isLoading={isLoading} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

